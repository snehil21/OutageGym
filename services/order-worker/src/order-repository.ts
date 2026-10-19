import {
  PutItemCommand,
  TransactWriteItemsCommand,
  TransactionCanceledException,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import type { OrderMessage } from "./order-message.js";
import type { MessageDelivery } from "./queue-consumer.js";

export type OrderCompletionResult = "completed" | "duplicate";

const isDuplicateTransaction = (error: unknown): boolean =>
  error instanceof TransactionCanceledException &&
  error.CancellationReasons?.some(
    (reason) => reason.Code === "ConditionalCheckFailed",
  ) === true;

export const recordOrderProcessing = async (
  dynamodb: DynamoDBClient,
  tableName: string,
  message: OrderMessage,
  startedAt: string,
): Promise<void> => {
  await dynamodb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        orderId: { S: message.orderId },
        recordId: { S: "ORDER" },
        recordType: { S: "ORDER" },
        status: { S: "PROCESSING" },
        schemaVersion: { N: String(message.schemaVersion) },
        correlationId: { S: message.correlationId },
        acceptedAt: { S: message.acceptedAt },
        processingStartedAt: { S: startedAt },
        productId: { S: message.productId },
        quantity: { N: String(message.quantity) },
      },
    }),
  );
};

export const completeOrder = async (
  dynamodb: DynamoDBClient,
  tableName: string,
  message: OrderMessage,
  completedAt: string,
  delivery: MessageDelivery,
  storageRevision: number,
): Promise<OrderCompletionResult> => {
  const completedOrder = {
    orderId: { S: message.orderId },
    recordId: { S: "ORDER" },
    recordType: { S: "ORDER" },
    status: { S: "COMPLETED" },
    schemaVersion: { N: String(message.schemaVersion) },
    correlationId: { S: message.correlationId },
    acceptedAt: { S: message.acceptedAt },
    completedAt: { S: completedAt },
    productId: { S: message.productId },
    quantity: { N: String(message.quantity) },
  };

  if (storageRevision === 2) {
    try {
      await dynamodb.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: completedOrder,
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  orderId: { S: message.orderId },
                  recordId: { S: "FULFILMENT" },
                  recordType: { S: "FULFILMENT" },
                  correlationId: { S: message.correlationId },
                  createdAt: { S: completedAt },
                },
                ConditionExpression:
                  "attribute_not_exists(orderId) AND attribute_not_exists(recordId)",
              },
            },
          ],
        }),
      );

      return "completed";
    } catch (error) {
      if (isDuplicateTransaction(error)) {
        return "duplicate";
      }

      throw error;
    }
  }

  await dynamodb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        orderId: { S: message.orderId },
        recordId: {
          S: `FULFILMENT#${delivery.messageId}#${delivery.receiveCount}`,
        },
        recordType: { S: "FULFILMENT" },
        correlationId: { S: message.correlationId },
        createdAt: { S: completedAt },
      },
    }),
  );

  await dynamodb.send(
    new PutItemCommand({
      TableName: tableName,
      Item: completedOrder,
    }),
  );

  return "completed";
};
