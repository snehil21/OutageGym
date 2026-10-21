import { createTelemetry, describeError } from "@outagegym/service-core";

import { buildApp } from "./app.js";
import { createCheckoutFault } from "./checkout-fault.js";
import { reserveCheckout } from "./checkout-repository.js";
import { loadConfig } from "./config.js";
import { checkTableReady, createDynamoDbClient } from "./dynamodb.js";
import { publishOrder } from "./order-publisher.js";
import { checkQueueReady, createSqsClient } from "./sqs.js";

const config = loadConfig();
const sqs = createSqsClient(config);
const dynamodb = createDynamoDbClient(config);
const checkoutFault = createCheckoutFault(config);
const telemetry = createTelemetry(config.otlpEndpointUrl, "order-api");
const checkoutCount = telemetry.meter.createCounter(
  "outagegym.api.checkout.idempotency",
  { description: "Checkout requests by idempotency outcome" },
);
const slowCheckoutCount = telemetry.meter.createCounter(
  "outagegym.api.checkout.slow_response.count",
  { description: "Checkout responses exceeding the service target" },
);
const app = buildApp({
  afterOrderPublished: (input) => checkoutFault.afterOrderPublished(input),
  checkReady: async () => {
    await Promise.all([
      checkQueueReady(sqs, config.orderProcessingQueueUrl),
      checkTableReady(dynamodb, config.checkoutRequestsTableName),
    ]);
  },
  meter: telemetry.meter,
  publishOrder: (message) =>
    publishOrder(sqs, config.orderProcessingQueueUrl, message),
  recordCheckout: ({
    correlationId,
    idempotencyKey,
    messageId,
    orderId,
    result,
  }) => {
    checkoutCount.add(1, { result });
    telemetry.logger.info(
      result === "created" ? "order_accepted" : "checkout_replayed",
      result === "created" ? "Order accepted" : "Checkout replayed",
      {
        correlationId,
        idempotencyKey,
        messageId,
        orderId,
        result,
      },
    );
  },
  recordSlowCheckout: ({ correlationId, idempotencyKey, orderId }) => {
    slowCheckoutCount.add(1);
    telemetry.logger.warn(
      "checkout_response_slow",
      "Checkout response exceeded the service target",
      {
        correlationId,
        idempotencyKey,
        orderId,
      },
    );
  },
  reserveCheckout: (input) =>
    config.checkoutIdempotencyEnabled
      ? reserveCheckout(dynamodb, config.checkoutRequestsTableName, input)
      : Promise.resolve({ ...input, created: true }),
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  telemetry.logger.info("shutdown_requested", "Shutdown requested", { signal });

  try {
    await app.close();
  } finally {
    sqs.destroy();
    dynamodb.destroy();
    await telemetry.shutdown();
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
  telemetry.logger.info("service_started", "Order API started");
} catch (error) {
  telemetry.logger.error(
    "service_start_failed",
    "Order API failed to start",
    describeError(error),
  );
  sqs.destroy();
  dynamodb.destroy();
  await telemetry.shutdown();
  process.exitCode = 1;
}
