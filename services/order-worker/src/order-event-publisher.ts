import {
  PutEventsCommand,
  type EventBridgeClient,
} from "@aws-sdk/client-eventbridge";

import type { OrderMessage } from "./order-message.js";

export const publishOrderCompleted = async (
  eventbridge: EventBridgeClient,
  eventBusName: string,
  message: OrderMessage,
  completedAt: string,
): Promise<string> => {
  const result = await eventbridge.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: "outagegym.orders",
          DetailType: "OrderCompleted",
          Detail: JSON.stringify({
            schemaVersion: 1,
            orderId: message.orderId,
            correlationId: message.correlationId,
            completedAt,
            notificationChannel: message.notificationChannel,
          }),
        },
      ],
    }),
  );

  const entry = result.Entries?.[0];

  if (result.FailedEntryCount !== 0 || entry?.EventId === undefined) {
    throw new Error(
      `Order completion event was rejected: ${entry?.ErrorMessage ?? "unknown error"}`,
    );
  }

  return entry.EventId;
};
