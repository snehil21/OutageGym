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

const readPort = (env: NodeJS.ProcessEnv): number => {
  const value = env.PORT ?? "3000";
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT: ${value}`);
  }

  return port;
};

const readBoolean = (env: NodeJS.ProcessEnv, name: string): boolean => {
  const value = readRequired(env, name);

  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be true or false`);
  }

  return value === "true";
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

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  host: env.HOST ?? "0.0.0.0",
  port: readPort(env),
  awsEndpointUrl: readLocalUrl(
    env,
    "AWS_ENDPOINT_URL",
    localAwsHosts,
    "4566",
    "Floci",
  ),
  awsRegion: env.AWS_REGION ?? "us-east-1",
  checkoutAmbiguousFailureDelayMs: readDelay(env),
  checkoutAmbiguousFailureProductPrefix: readRequired(
    env,
    "CHECKOUT_AMBIGUOUS_FAILURE_PRODUCT_PREFIX",
  ),
  checkoutAmbiguousFailuresEnabled: readBoolean(
    env,
    "CHECKOUT_AMBIGUOUS_FAILURES_ENABLED",
  ),
  checkoutIdempotencyEnabled: readBoolean(
    env,
    "CHECKOUT_IDEMPOTENCY_ENABLED",
  ),
  checkoutRequestsTableName: readRequired(env, "CHECKOUT_REQUESTS_TABLE_NAME"),
  orderProcessingQueueUrl: readLocalUrl(
    env,
    "ORDER_PROCESSING_QUEUE_URL",
    localAwsHosts,
    "4566",
    "Floci",
  ),
  otlpEndpointUrl: readLocalUrl(
    env,
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    localOtelHosts,
    "4318",
    "OpenTelemetry Collector",
  ),
});
