import type { ObservableCallback } from "@opentelemetry/api";
import {
  createStructuredLogger,
  createTelemetry,
  describeError,
} from "@outagegym/service-core";

import {
  checkAwsResourcesReady,
  createAwsClients,
  readQueueDepth,
} from "./aws.js";
import { loadConfig } from "./config.js";
import { startHealthServer } from "./health-server.js";
import { processOrderMessage } from "./message-processor.js";
import { publishOrderCompleted } from "./order-event-publisher.js";
import { completeOrder, recordOrderProcessing } from "./order-repository.js";
import { consumeNextMessage } from "./queue-consumer.js";

const bootstrapLogger = createStructuredLogger("order-worker");

const pause = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const runWorker = async (): Promise<void> => {
  const config = loadConfig();
  const clients = createAwsClients(config);
  const telemetry = createTelemetry(config.otlpEndpointUrl, "order-worker");
  const processingCount = telemetry.meter.createCounter(
    "outagegym.worker.processing.count",
    {
      description: "Number of order messages processed by result",
    },
  );
  const processingDuration = telemetry.meter.createHistogram(
    "outagegym.worker.processing.duration",
    {
      description: "Order message processing duration",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [
          0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
        ],
      },
    },
  );
  const failureCount = telemetry.meter.createCounter(
    "outagegym.worker.processing.failure.count",
    {
      description: "Number of worker processing-loop failures",
    },
  );
  const retryCount = telemetry.meter.createCounter(
    "outagegym.worker.retry.count",
    {
      description: "Number of successfully handled SQS retry deliveries",
    },
  );
  const duplicatePreventionCount = telemetry.meter.createCounter(
    "outagegym.worker.duplicate_prevention.count",
    {
      description: "Number of duplicate order writes prevented",
    },
  );
  const completionEventCount = telemetry.meter.createCounter(
    "outagegym.worker.completion_event.count",
    {
      description: "Order completion events published by notification channel",
    },
  );
  const queueMessages = telemetry.meter.createObservableGauge(
    "outagegym.worker.queue.messages",
    {
      description: "Approximate SQS order-processing queue depth by state",
    },
  );
  const observeQueueDepth: ObservableCallback = async (observation) => {
    try {
      const depth = await readQueueDepth(
        clients.sqs,
        config.orderProcessingQueueUrl,
      );

      observation.observe(depth.available, { state: "available" });
      observation.observe(depth.delayed, { state: "delayed" });
      observation.observe(depth.inFlight, { state: "in_flight" });
    } catch (error) {
      telemetry.logger.error(
        "queue_metrics_collection_failed",
        "Queue metrics collection failed",
        describeError(error),
      );
    }
  };
  queueMessages.addCallback(observeQueueDepth);
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
    telemetry.logger.info("shutdown_requested", "Shutdown requested", {
      signal,
    });
    abortController.abort();
  };

  const onSigint = (): void => requestShutdown("SIGINT");
  const onSigterm = (): void => requestShutdown("SIGTERM");

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  telemetry.logger.info("worker_started", "Order worker started", {
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
          async (body, delivery) => {
            const startedAt = process.hrtime.bigint();

            try {
              const processed = await processOrderMessage(body, delivery, {
                completeOrder: (
                  message,
                  completedAt,
                  currentDelivery,
                  storageRevision,
                ) =>
                  completeOrder(
                    clients.dynamodb,
                    config.orderRecordsTableName,
                    message,
                    completedAt,
                    currentDelivery,
                    storageRevision,
                  ),
                now: () => new Date(),
                publishOrderCompleted: (message, completedAt) =>
                  config.orderCompletionEventBusName === undefined
                    ? Promise.resolve(undefined)
                    : publishOrderCompleted(
                        clients.eventbridge,
                        config.orderCompletionEventBusName,
                        message,
                        completedAt,
                      ),
                processOrder: async (message) => {
                  const duration =
                    message.quantity >= config.bulkOrderMinQuantity
                      ? config.bulkOrderProcessingDurationMs
                      : config.orderProcessingDurationMs;

                  await pause(duration);
                },
                recordOrderProcessing: (message, startedAt, storageRevision) =>
                  recordOrderProcessing(
                    clients.dynamodb,
                    config.orderRecordsTableName,
                    message,
                    startedAt,
                    storageRevision,
                  ),
                storageRevision: config.orderStorageRevision,
              });

              processingDuration.record(
                Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
                { result: processed.result },
              );

              return processed;
            } catch (error) {
              processingDuration.record(
                Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
                { result: "failed" },
              );
              throw error;
            }
          },
          abortController.signal,
        );

        if (result !== undefined) {
          telemetry.logger.info("order_processed", "Order processed", {
            ...result,
          });
          processingCount.add(1, { result: result.result });

          if (result.receiveCount > 1) {
            retryCount.add(1);
          }

          if (result.result === "duplicate") {
            duplicatePreventionCount.add(1);
          }

          if (result.completionEventId !== undefined) {
            completionEventCount.add(1, {
              channel: result.notificationChannel,
            });
          }
        }
      } catch (error) {
        if (stopping) {
          break;
        }

        telemetry.logger.error(
          "message_processing_failed",
          "Message processing failed",
          describeError(error),
        );
        failureCount.add(1);
        await pause(1_000);
      }
    }
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    queueMessages.removeCallback(observeQueueDepth);
    await healthServer.close();
    clients.destroy();
    telemetry.logger.info("worker_stopped", "Order worker stopped");
    await telemetry.shutdown();
  }
};

try {
  await runWorker();
} catch (error) {
  bootstrapLogger.error(
    "worker_failed",
    "Order worker failed",
    describeError(error),
  );
  process.exitCode = 1;
}
