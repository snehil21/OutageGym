import { parseOrderMessage, type OrderMessage } from "./order-message.js";
import type { OrderCompletionResult } from "./order-repository.js";

export interface MessageProcessorDependencies {
  completeOrder(
    message: OrderMessage,
    completedAt: string,
  ): Promise<OrderCompletionResult>;
  now(): Date;
  processOrder(message: OrderMessage): Promise<void>;
}

export interface ProcessedOrder {
  orderId: string;
  correlationId: string;
  result: OrderCompletionResult;
}

export const processOrderMessage = async (
  body: string | undefined,
  dependencies: MessageProcessorDependencies,
): Promise<ProcessedOrder> => {
  const message = parseOrderMessage(body);
  await dependencies.processOrder(message);
  const result = await dependencies.completeOrder(
    message,
    dependencies.now().toISOString(),
  );

  return {
    orderId: message.orderId,
    correlationId: message.correlationId,
    result,
  };
};
