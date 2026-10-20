import { buildApp } from "./app.js";
import { createCheckoutFault } from "./checkout-fault.js";
import { reserveCheckout } from "./checkout-repository.js";
import { loadConfig } from "./config.js";
import { checkTableReady, createDynamoDbClient } from "./dynamodb.js";
import { publishOrder } from "./order-publisher.js";
import { checkQueueReady, createSqsClient } from "./sqs.js";
import { createTelemetry } from "./telemetry.js";

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
    telemetry.logger.emit({
      body: result === "created" ? "Order accepted" : "Checkout replayed",
      severityText: "INFO",
      attributes: {
        correlationId,
        event: result === "created" ? "order_accepted" : "checkout_replayed",
        idempotencyKey,
        messageId,
        orderId,
        result,
      },
    });
  },
  recordSlowCheckout: ({ correlationId, idempotencyKey, orderId }) => {
    slowCheckoutCount.add(1);
    telemetry.logger.emit({
      body: "Checkout response exceeded the service target",
      severityText: "WARN",
      attributes: {
        correlationId,
        event: "checkout_response_slow",
        idempotencyKey,
        orderId,
      },
    });
  },
  reserveCheckout: (input) =>
    config.checkoutIdempotencyEnabled
      ? reserveCheckout(dynamodb, config.checkoutRequestsTableName, input)
      : Promise.resolve({ ...input, created: true }),
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, "Shutdown requested");

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
  telemetry.logger.emit({
    body: "Order API started",
    attributes: {
      event: "service_started",
    },
  });
} catch (error) {
  app.log.error(error, "Order API failed to start");
  sqs.destroy();
  dynamodb.destroy();
  await telemetry.shutdown();
  process.exitCode = 1;
}
