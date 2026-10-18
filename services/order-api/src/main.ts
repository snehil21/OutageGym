import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { publishOrder } from "./order-publisher.js";
import { checkQueueReady, createSqsClient } from "./sqs.js";

const config = loadConfig();
const sqs = createSqsClient(config);
const app = buildApp({
  checkReady: () => checkQueueReady(sqs, config.orderProcessingQueueUrl),
  publishOrder: (message) =>
    publishOrder(sqs, config.orderProcessingQueueUrl, message),
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, "Shutdown requested");

  try {
    await app.close();
  } finally {
    sqs.destroy();
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error, "Order API failed to start");
  sqs.destroy();
  process.exitCode = 1;
}
