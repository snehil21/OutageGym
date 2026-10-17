import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderMessage,
} from "./order.js";

export interface OrderRouteDependencies {
  publishOrder(message: OrderMessage): Promise<string>;
}

export const registerOrderRoute = (
  app: FastifyInstance,
  dependencies: OrderRouteDependencies,
): void => {
  app.post<{ Body: CreateOrderRequest; Reply: CreateOrderResponse }>(
    "/orders",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["productId", "quantity"],
          properties: {
            productId: {
              type: "string",
              minLength: 1,
              maxLength: 100,
              pattern: "\\S",
            },
            quantity: {
              type: "integer",
              minimum: 1,
              maximum: 100,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const orderId = randomUUID();
      const correlationId = request.id;
      const acceptedAt = new Date().toISOString();

      const messageId = await dependencies.publishOrder({
        schemaVersion: 1,
        orderId,
        correlationId,
        acceptedAt,
        productId: request.body.productId,
        quantity: request.body.quantity,
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
