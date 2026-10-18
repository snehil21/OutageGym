import {
  TransactWriteItemsCommand,
  TransactionCanceledException,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import type { OrderMessage } from "./order-message.js";

export type OrderCompletionResult = "completed" | "duplicate";

const isDuplicateTransaction = (error: unknown): boolean =>
  error instanceof TransactionCanceledException &&
  error.CancellationReasons?.some(
    (reason) => reason.Code === "ConditionalCheckFailed",
  ) === true;

export const completeOrder = async (
  dynamodb: DynamoDBClient,
  tableName: string,
  message: OrderMessage,
  completedAt: string,
): Promise<OrderCompletionResult> => {
  try {
    await dynamodb.send(
      new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName,
              Item: {
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
              },
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
};
