import {
  ConditionalCheckFailedException,
  GetItemCommand,
  PutItemCommand,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import type { NotificationChannel } from "./order.js";

export interface CheckoutReservationInput {
  acceptedAt: string;
  correlationId: string;
  idempotencyKey: string;
  notificationChannel: NotificationChannel;
  orderId: string;
  productId: string;
  quantity: number;
}

export interface CheckoutReservation extends CheckoutReservationInput {
  created: boolean;
}

export class CheckoutConflictError extends Error {
  constructor() {
    super("Idempotency key was already used for a different checkout request");
    this.name = "CheckoutConflictError";
  }
}

const requiredString = (value: string | undefined, field: string): string => {
  if (value === undefined || value === "") {
    throw new Error(`Checkout reservation is missing ${field}`);
  }

  return value;
};

export const reserveCheckout = async (
  dynamodb: DynamoDBClient,
  tableName: string,
  input: CheckoutReservationInput,
): Promise<CheckoutReservation> => {
  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          idempotencyKey: { S: input.idempotencyKey },
          orderId: { S: input.orderId },
          correlationId: { S: input.correlationId },
          acceptedAt: { S: input.acceptedAt },
          productId: { S: input.productId },
          quantity: { N: String(input.quantity) },
          notificationChannel: { S: input.notificationChannel },
        },
        ConditionExpression: "attribute_not_exists(idempotencyKey)",
      }),
    );

    return { ...input, created: true };
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }

  const existing = await dynamodb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: { idempotencyKey: { S: input.idempotencyKey } },
      ConsistentRead: true,
    }),
  );

  if (existing.Item === undefined) {
    throw new Error("Checkout reservation disappeared after a duplicate write");
  }

  const productId = requiredString(existing.Item.productId?.S, "productId");
  const quantity = Number(existing.Item.quantity?.N);
  const notificationChannel = requiredString(
    existing.Item.notificationChannel?.S,
    "notificationChannel",
  );

  if (
    productId !== input.productId ||
    quantity !== input.quantity ||
    notificationChannel !== input.notificationChannel
  ) {
    throw new CheckoutConflictError();
  }

  if (notificationChannel !== "EMAIL" && notificationChannel !== "SMS") {
    throw new Error("Checkout reservation has an invalid notification channel");
  }

  return {
    acceptedAt: requiredString(existing.Item.acceptedAt?.S, "acceptedAt"),
    correlationId: requiredString(
      existing.Item.correlationId?.S,
      "correlationId",
    ),
    created: false,
    idempotencyKey: input.idempotencyKey,
    notificationChannel,
    orderId: requiredString(existing.Item.orderId?.S, "orderId"),
    productId,
    quantity,
  };
};
