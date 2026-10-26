import {
  DEFAULT_AWS_REGION,
  DEFAULT_BIND_HOST,
  LOCAL_AWS_HOSTS,
  LOCAL_AWS_PORT,
  LOCAL_OTLP_HOSTS,
  LOCAL_OTLP_PORT,
  readInteger,
  readLocalUrl,
  readRequired,
} from "@outagegym/service-core";

export interface WorkerConfig {
  awsEndpointUrl: string;
  awsRegion: string;
  bulkOrderMinQuantity: number;
  bulkOrderProcessingDurationMs: number;
  healthHost: string;
  healthPort: number;
  orderProcessingQueueUrl: string;
  orderProcessingDeadLetterQueueUrl: string;
  orderProcessingDurationMs: number;
  orderRecordsTableName: string;
  orderCompletionEventBusName: string | undefined;
  orderStorageRevision: number;
  otlpEndpointUrl: string;
  receiveWaitTimeSeconds: number;
}

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): WorkerConfig => ({
  awsEndpointUrl: readLocalUrl(
    env,
    "AWS_ENDPOINT_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  awsRegion: env.AWS_REGION ?? DEFAULT_AWS_REGION,
  bulkOrderMinQuantity: readInteger(
    env,
    "BULK_ORDER_MIN_QUANTITY",
    100,
    1,
    100,
  ),
  bulkOrderProcessingDurationMs: readInteger(
    env,
    "BULK_ORDER_PROCESSING_DURATION_MS",
    0,
    0,
    600_000,
  ),
  healthHost: env.HEALTH_HOST ?? DEFAULT_BIND_HOST,
  healthPort: readInteger(env, "HEALTH_PORT", 3_001, 1, 65_535),
  orderProcessingQueueUrl: readLocalUrl(
    env,
    "ORDER_PROCESSING_QUEUE_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  orderProcessingDeadLetterQueueUrl: readLocalUrl(
    env,
    "ORDER_PROCESSING_DLQ_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  orderProcessingDurationMs: readInteger(
    env,
    "ORDER_PROCESSING_DURATION_MS",
    0,
    0,
    600_000,
  ),
  orderRecordsTableName: readRequired(env, "ORDER_RECORDS_TABLE_NAME"),
  orderCompletionEventBusName:
    env.ORDER_COMPLETION_EVENT_BUS_NAME?.trim() || undefined,
  orderStorageRevision: readInteger(env, "ORDER_STORAGE_REVISION", 2, 1, 2),
  otlpEndpointUrl: readLocalUrl(
    env,
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    LOCAL_OTLP_HOSTS,
    LOCAL_OTLP_PORT,
    "OpenTelemetry Collector",
  ),
  receiveWaitTimeSeconds: readInteger(
    env,
    "SQS_RECEIVE_WAIT_TIME_SECONDS",
    10,
    0,
    20,
  ),
});
