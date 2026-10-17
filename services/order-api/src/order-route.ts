import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type { CreateOrderResponse, OrderMessage } from "./order.js";

export interface OrderRouteDependencies {
  publishOrder(message: OrderMessage): Promise<string>;
}

export const registerOrderRoute = (
  app: FastifyInstance,
  dependencies: OrderRouteDependencies,
): void => {
  app.post<{ Reply: CreateOrderResponse }>(
    "/orders",
    async (request, reply) => {
      const orderId = randomUUID();
      const correlationId = request.id;
      const acceptedAt = new Date().toISOString();

      const messageId = await dependencies.publishOrder({
        schemaVersion: 1,
        orderId,
        correlationId,
        acceptedAt,
      });

      request.log.info(
        { correlationId, messageId, orderId },
        "Order accepted",
      );

      return reply.code(202).send({
        orderId,
        correlationId,
        status: "accepted",
      });
    },
  );
};
