export interface WorkerConfig {
  awsEndpointUrl: string;
  awsRegion: string;
  bulkOrderMinQuantity: number;
  bulkOrderProcessingDurationMs: number;
  healthHost: string;
  healthPort: number;
  orderProcessingQueueUrl: string;
  orderProcessingDurationMs: number;
  orderRecordsTableName: string;
  orderCompletionEventBusName: string | undefined;
  orderStorageRevision: number;
  otlpEndpointUrl: string;
  receiveWaitTimeSeconds: number;
}

const localAwsHosts = new Set(["floci", "localhost", "127.0.0.1"]);
const localOtelHosts = new Set([
  "otel-collector",
  "localhost",
  "127.0.0.1",
]);

const readRequired = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readInteger = (
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const value = env[name] ?? String(fallback);
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }

  return parsed;
};

const readLocalUrl = (
  env: NodeJS.ProcessEnv,
  name: string,
  allowedHosts: ReadonlySet<string>,
  expectedPort: string,
  serviceName: string,
): string => {
  const value = readRequired(env, name);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (
    url.protocol !== "http:" ||
    !allowedHosts.has(url.hostname) ||
    url.port !== expectedPort
  ) {
    throw new Error(
      `${name} must target the local ${serviceName} endpoint on port ${expectedPort}`,
    );
  }

  return value;
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): WorkerConfig => ({
  awsEndpointUrl: readLocalUrl(
    env,
    "AWS_ENDPOINT_URL",
    localAwsHosts,
    "4566",
    "Floci",
  ),
  awsRegion: env.AWS_REGION ?? "us-east-1",
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
  healthHost: env.HEALTH_HOST ?? "0.0.0.0",
  healthPort: readInteger(env, "HEALTH_PORT", 3_001, 1, 65_535),
  orderProcessingQueueUrl: readLocalUrl(
    env,
    "ORDER_PROCESSING_QUEUE_URL",
    localAwsHosts,
    "4566",
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
  orderStorageRevision: readInteger(
    env,
    "ORDER_STORAGE_REVISION",
    2,
    1,
    2,
  ),
  otlpEndpointUrl: readLocalUrl(
    env,
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    localOtelHosts,
    "4318",
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
