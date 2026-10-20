import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderMessage,
} from "./order.js";
import {
  CheckoutConflictError,
  type CheckoutReservation,
  type CheckoutReservationInput,
} from "./checkout-repository.js";

export interface OrderRouteDependencies {
  afterOrderPublished(input: {
    idempotencyKey: string;
    productId: string;
  }): Promise<boolean>;
  publishOrder(message: OrderMessage): Promise<string>;
  recordCheckout(event: {
    correlationId: string;
    idempotencyKey: string;
    messageId: string;
    orderId: string;
    result: "created" | "reused";
  }): void;
  recordSlowCheckout(event: {
    correlationId: string;
    idempotencyKey: string;
    orderId: string;
  }): void;
  reserveCheckout(
    input: CheckoutReservationInput,
  ): Promise<CheckoutReservation>;
}

const readIdempotencyKey = (value: string | undefined): string => {
  return value?.trim() || randomUUID();
};

export const registerOrderRoute = (
  app: FastifyInstance,
  dependencies: OrderRouteDependencies,
): void => {
  app.post<{
    Body: CreateOrderRequest;
    Headers: { "idempotency-key"?: string };
    Reply:
      | CreateOrderResponse
      | { error: "idempotency_conflict"; message: string };
  }>(
    "/orders",
    {
      schema: {
        headers: {
          type: "object",
          properties: {
            "idempotency-key": {
              type: "string",
              minLength: 1,
              maxLength: 128,
            },
          },
        },
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
            notificationChannel: {
              type: "string",
              enum: ["EMAIL", "SMS"],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const idempotencyKey = readIdempotencyKey(
        request.headers["idempotency-key"],
      );
      let reservation: CheckoutReservation;

      try {
        reservation = await dependencies.reserveCheckout({
          orderId: randomUUID(),
          correlationId: request.id,
          idempotencyKey,
          acceptedAt: new Date().toISOString(),
          productId: request.body.productId,
          quantity: request.body.quantity,
          notificationChannel: request.body.notificationChannel ?? "EMAIL",
        });
      } catch (error) {
        if (error instanceof CheckoutConflictError) {
          return reply.code(409).send({
            error: "idempotency_conflict",
            message: error.message,
          });
        }

        throw error;
      }

      if (!reservation.created) {
        request.log.info(
          {
            correlationId: reservation.correlationId,
            idempotencyKey,
            orderId: reservation.orderId,
          },
          "Checkout replayed",
        );
        dependencies.recordCheckout({
          correlationId: reservation.correlationId,
          idempotencyKey,
          messageId: "existing",
          orderId: reservation.orderId,
          result: "reused",
        });

        return reply.code(202).send({
          orderId: reservation.orderId,
          correlationId: reservation.correlationId,
          status: "accepted",
        });
      }

      const messageId = await dependencies.publishOrder({
        schemaVersion: 1,
        orderId: reservation.orderId,
        correlationId: reservation.correlationId,
        idempotencyKey,
        acceptedAt: reservation.acceptedAt,
        productId: reservation.productId,
        quantity: reservation.quantity,
        notificationChannel: reservation.notificationChannel,
      });

      request.log.info(
        {
          correlationId: reservation.correlationId,
          idempotencyKey,
          messageId,
          orderId: reservation.orderId,
        },
        "Order accepted",
      );
      dependencies.recordCheckout({
        correlationId: reservation.correlationId,
        idempotencyKey,
        messageId,
        orderId: reservation.orderId,
        result: "created",
      });

      const delayed = await dependencies.afterOrderPublished({
        idempotencyKey,
        productId: reservation.productId,
      });
      if (delayed) {
        dependencies.recordSlowCheckout({
          correlationId: reservation.correlationId,
          idempotencyKey,
          orderId: reservation.orderId,
        });
      }

      return reply.code(202).send({
        orderId: reservation.orderId,
        correlationId: reservation.correlationId,
        status: "accepted",
      });
    },
  );
};
