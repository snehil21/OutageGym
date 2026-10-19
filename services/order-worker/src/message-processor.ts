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
  processOrder(message: OrderMessage): Promise<void>;
  recordOrderProcessing(message: OrderMessage, startedAt: string): Promise<void>;
  storageRevision: number;
}

export interface ProcessedOrder {
  orderId: string;
  correlationId: string;
  result: OrderCompletionResult;
}

export const processOrderMessage = async (
  body: string | undefined,
  delivery: MessageDelivery,
  dependencies: MessageProcessorDependencies,
): Promise<ProcessedOrder> => {
  const message = parseOrderMessage(body);
  await dependencies.recordOrderProcessing(
    message,
    dependencies.now().toISOString(),
  );
  await dependencies.processOrder(message);
  const result = await dependencies.completeOrder(
    message,
    dependencies.now().toISOString(),
    delivery,
    dependencies.storageRevision,
  );

  return {
    orderId: message.orderId,
    correlationId: message.correlationId,
    result,
  };
};
