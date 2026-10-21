import {
  DEFAULT_AWS_REGION,
  DEFAULT_BIND_HOST,
  LOCAL_AWS_HOSTS,
  LOCAL_AWS_PORT,
  LOCAL_OTLP_HOSTS,
  LOCAL_OTLP_PORT,
  readBoolean,
  readInteger,
  readLocalUrl,
  readRequired,
} from "@outagegym/service-core";

export interface AppConfig {
  host: string;
  port: number;
  awsEndpointUrl: string;
  awsRegion: string;
  checkoutAmbiguousFailureDelayMs: number;
  checkoutAmbiguousFailureProductPrefix: string;
  checkoutAmbiguousFailuresEnabled: boolean;
  checkoutIdempotencyEnabled: boolean;
  checkoutRequestsTableName: string;
  orderProcessingQueueUrl: string;
  otlpEndpointUrl: string;
}

const readPort = (env: NodeJS.ProcessEnv): number => {
  return readInteger(env, "PORT", 3_000, 1, 65_535);
};

const readDelay = (env: NodeJS.ProcessEnv): number => {
  const value = readRequired(env, "CHECKOUT_AMBIGUOUS_FAILURE_DELAY_MS");
  const delay = Number(value);

  if (!Number.isInteger(delay) || delay < 0 || delay > 30_000) {
    throw new Error(
      "CHECKOUT_AMBIGUOUS_FAILURE_DELAY_MS must be an integer from 0 to 30000",
    );
  }

  return delay;
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): AppConfig => ({
  host: env.HOST ?? DEFAULT_BIND_HOST,
  port: readPort(env),
  awsEndpointUrl: readLocalUrl(
    env,
    "AWS_ENDPOINT_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  awsRegion: env.AWS_REGION ?? DEFAULT_AWS_REGION,
  checkoutAmbiguousFailureDelayMs: readDelay(env),
  checkoutAmbiguousFailureProductPrefix: readRequired(
    env,
    "CHECKOUT_AMBIGUOUS_FAILURE_PRODUCT_PREFIX",
  ),
  checkoutAmbiguousFailuresEnabled: readBoolean(
    env,
    "CHECKOUT_AMBIGUOUS_FAILURES_ENABLED",
  ),
  checkoutIdempotencyEnabled: readBoolean(env, "CHECKOUT_IDEMPOTENCY_ENABLED"),
  checkoutRequestsTableName: readRequired(env, "CHECKOUT_REQUESTS_TABLE_NAME"),
  orderProcessingQueueUrl: readLocalUrl(
    env,
    "ORDER_PROCESSING_QUEUE_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  otlpEndpointUrl: readLocalUrl(
    env,
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    LOCAL_OTLP_HOSTS,
    LOCAL_OTLP_PORT,
    "OpenTelemetry Collector",
  ),
});
