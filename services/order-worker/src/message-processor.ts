import { parseOrderMessage, type OrderMessage } from "./order-message.js";
import type { OrderCompletionResult } from "./order-repository.js";
import type { MessageDelivery } from "./queue-consumer.js";

export interface MessageProcessorDependencies {
  completeOrder(
    message: OrderMessage,
    completedAt: string,
    delivery: MessageDelivery,
    storageRevision: number,
  ): Promise<OrderCompletionResult>;
  now(): Date;
  publishOrderCompleted(
    message: OrderMessage,
    completedAt: string,
  ): Promise<string | undefined>;
  processOrder(message: OrderMessage): Promise<void>;
  recordOrderProcessing(
    message: OrderMessage,
    startedAt: string,
    storageRevision: number,
  ): Promise<"started" | "duplicate">;
  storageRevision: number;
}

export interface ProcessedOrder {
  completionEventId: string | undefined;
  orderId: string;
  correlationId: string;
  notificationChannel: "EMAIL" | "SMS";
  result: OrderCompletionResult;
}

export const processOrderMessage = async (
  body: string | undefined,
  delivery: MessageDelivery,
  dependencies: MessageProcessorDependencies,
): Promise<ProcessedOrder> => {
  const message = parseOrderMessage(body);
  const processingResult = await dependencies.recordOrderProcessing(
    message,
    dependencies.now().toISOString(),
    dependencies.storageRevision,
  );

  if (processingResult === "duplicate") {
    return {
      completionEventId: undefined,
      orderId: message.orderId,
      correlationId: message.correlationId,
      notificationChannel: message.notificationChannel,
      result: "duplicate",
    };
  }

  await dependencies.processOrder(message);
  const completedAt = dependencies.now().toISOString();
  const result = await dependencies.completeOrder(
    message,
    completedAt,
    delivery,
    dependencies.storageRevision,
  );
  const completionEventId =
    result === "completed"
      ? await dependencies.publishOrderCompleted(message, completedAt)
      : undefined;

  return {
    completionEventId,
    orderId: message.orderId,
    correlationId: message.correlationId,
    notificationChannel: message.notificationChannel,
    result,
  };
};
