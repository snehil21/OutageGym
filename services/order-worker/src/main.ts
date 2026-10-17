import { checkAwsResourcesReady, createAwsClients } from "./aws.js";
import { loadConfig } from "./config.js";
import { startHealthServer } from "./health-server.js";
import { processOrderMessage } from "./message-processor.js";
import { completeOrder } from "./order-repository.js";
import { consumeNextMessage } from "./queue-consumer.js";

type LogLevel = "error" | "info";

const log = (
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void => {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "order-worker",
    event,
    ...fields,
  });

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
};

const describeError = (error: unknown): Record<string, unknown> =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: error.message }
    : { errorMessage: String(error) };

const pause = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const runWorker = async (): Promise<void> => {
  const config = loadConfig();
  const clients = createAwsClients(config);
  const healthServer = await startHealthServer({
    host: config.healthHost,
    port: config.healthPort,
    checkReady: () =>
      checkAwsResourcesReady(
        clients,
        config.orderProcessingQueueUrl,
        config.orderRecordsTableName,
      ),
  });
  const abortController = new AbortController();
  let stopping = false;

  const requestShutdown = (signal: NodeJS.Signals): void => {
    if (stopping) {
      return;
    }

    stopping = true;
    log("info", "shutdown_requested", { signal });
    abortController.abort();
  };

  const onSigint = (): void => requestShutdown("SIGINT");
  const onSigterm = (): void => requestShutdown("SIGTERM");

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  log("info", "worker_started", {
    queueUrl: config.orderProcessingQueueUrl,
    tableName: config.orderRecordsTableName,
  });

  try {
    while (!stopping) {
      try {
        const result = await consumeNextMessage(
          clients.sqs,
          config.orderProcessingQueueUrl,
          config.receiveWaitTimeSeconds,
          (body) =>
            processOrderMessage(body, {
              completeOrder: (message, completedAt) =>
                completeOrder(
                  clients.dynamodb,
                  config.orderRecordsTableName,
                  message,
                  completedAt,
                ),
              now: () => new Date(),
            }),
          abortController.signal,
        );

        if (result !== undefined) {
          log("info", "order_processed", { ...result });
        }
      } catch (error) {
        if (stopping) {
          break;
        }

        log("error", "message_processing_failed", describeError(error));
        await pause(1_000);
      }
    }
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    await healthServer.close();
    clients.destroy();
    log("info", "worker_stopped");
  }
};

try {
  await runWorker();
} catch (error) {
  log("error", "worker_failed", describeError(error));
  process.exitCode = 1;
}
