import {
  ConditionalCheckFailedException,
  PutItemCommand,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import type { NotificationMessage } from "./notification-message.js";

export type NotificationResult = "delivered" | "duplicate";

export const recordNotification = async (
  dynamodb: DynamoDBClient,
  tableName: string,
  message: NotificationMessage,
  deliveredAt: string,
): Promise<NotificationResult> => {
  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          orderId: { S: message.orderId },
          correlationId: { S: message.correlationId },
          notificationChannel: { S: message.notificationChannel },
          completedAt: { S: message.completedAt },
          deliveredAt: { S: deliveredAt },
          status: { S: "DELIVERED" },
        },
        ConditionExpression: "attribute_not_exists(orderId)",
      }),
    );
    return "delivered";
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return "duplicate";
    }
    throw error;
  }
};
