import type { ObservableCallback } from "@opentelemetry/api";
import {
  createStructuredLogger,
  createTelemetry,
  describeError,
} from "@outagegym/service-core";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";

import { checkReady, createAwsClients, readQueueDepth } from "./aws.js";
import { loadConfig } from "./config.js";
import { startHealthServer } from "./health-server.js";
import { parseNotificationMessage } from "./notification-message.js";
import { recordNotification } from "./notification-repository.js";

const bootstrapLogger = createStructuredLogger("notification-worker");

const pause = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const run = async (): Promise<void> => {
  const config = loadConfig();
  const clients = createAwsClients(config);
  const telemetry = createTelemetry(
    config.otlpEndpointUrl,
    "notification-worker",
  );
  const processingCount = telemetry.meter.createCounter(
    "outagegym.notification.processing.count",
    { description: "Notification messages handled by result and channel" },
  );
  const queueMessages = telemetry.meter.createObservableGauge(
    "outagegym.notification.queue.messages",
    { description: "Available notification messages" },
  );
  const observeQueue: ObservableCallback = async (observation) => {
    try {
      observation.observe(
        await readQueueDepth(clients.sqs, config.notificationQueueUrl),
      );
    } catch (error) {
      telemetry.logger.error(
        "queue_metrics_collection_failed",
        "Queue metrics collection failed",
        describeError(error),
      );
    }
  };
  queueMessages.addCallback(observeQueue);
  const health = await startHealthServer(
    config.healthHost,
    config.healthPort,
    () =>
      checkReady(
        clients.sqs,
        clients.dynamodb,
        config.notificationQueueUrl,
        config.notificationRecordsTableName,
      ),
  );
  const abortController = new AbortController();
  let stopping = false;

  const stop = (signal: NodeJS.Signals): void => {
    if (!stopping) {
      stopping = true;
      telemetry.logger.info("shutdown_requested", "Shutdown requested", {
        signal,
      });
      abortController.abort();
    }
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  telemetry.logger.info("worker_started", "Notification worker started", {
    queueUrl: config.notificationQueueUrl,
    tableName: config.notificationRecordsTableName,
  });

  try {
    while (!stopping) {
      try {
        const response = await clients.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: config.notificationQueueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: config.receiveWaitTimeSeconds,
          }),
          { abortSignal: abortController.signal },
        );
        const delivery = response.Messages?.[0];
        if (
          delivery?.Body === undefined ||
          delivery.ReceiptHandle === undefined
        ) {
          continue;
        }

        const message = parseNotificationMessage(delivery.Body);
        const result = await recordNotification(
          clients.dynamodb,
          config.notificationRecordsTableName,
          message,
          new Date().toISOString(),
        );
        await clients.sqs.send(
          new DeleteMessageCommand({
            QueueUrl: config.notificationQueueUrl,
            ReceiptHandle: delivery.ReceiptHandle,
          }),
        );
        const fields = {
          orderId: message.orderId,
          correlationId: message.correlationId,
          notificationChannel: message.notificationChannel,
          messageId: delivery.MessageId,
          result,
        };
        telemetry.logger.info(
          "notification_processed",
          "Notification processed",
          fields,
        );
        processingCount.add(1, {
          result,
          channel: message.notificationChannel,
        });
      } catch (error) {
        if (!stopping) {
          telemetry.logger.error(
            "notification_processing_failed",
            "Notification processing failed",
            describeError(error),
          );
          await pause(1_000);
        }
      }
    }
  } finally {
    queueMessages.removeCallback(observeQueue);
    await health.close();
    clients.destroy();
    await telemetry.shutdown();
    telemetry.logger.info("worker_stopped", "Notification worker stopped");
  }
};

try {
  await run();
} catch (error) {
  bootstrapLogger.error(
    "worker_failed",
    "Notification worker failed",
    describeError(error),
  );
  process.exitCode = 1;
}
