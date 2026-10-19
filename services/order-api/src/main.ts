import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { publishOrder } from "./order-publisher.js";
import { checkQueueReady, createSqsClient } from "./sqs.js";
import { createTelemetry } from "./telemetry.js";

const config = loadConfig();
const sqs = createSqsClient(config);
const telemetry = createTelemetry(config.otlpEndpointUrl, "order-api");
const app = buildApp({
  checkReady: () => checkQueueReady(sqs, config.orderProcessingQueueUrl),
  meter: telemetry.meter,
  publishOrder: (message) =>
    publishOrder(sqs, config.orderProcessingQueueUrl, message),
  recordOrderAccepted: ({ correlationId, messageId, orderId }) => {
    telemetry.logger.emit({
      body: "Order accepted",
      severityText: "INFO",
      attributes: {
        correlationId,
        event: "order_accepted",
        messageId,
        orderId,
      },
    });
  },
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, "Shutdown requested");

  try {
    await app.close();
  } finally {
    sqs.destroy();
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
  await telemetry.shutdown();
  process.exitCode = 1;
}
