export interface NotificationWorkerConfig {
  awsEndpointUrl: string;
  awsRegion: string;
  healthHost: string;
  healthPort: number;
  notificationQueueUrl: string;
  notificationRecordsTableName: string;
  otlpEndpointUrl: string;
  receiveWaitTimeSeconds: number;
}

const localHosts = new Set(["floci", "otel-collector", "localhost", "127.0.0.1"]);

const required = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const integer = (
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const value = Number(env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
};

const localUrl = (
  env: NodeJS.ProcessEnv,
  name: string,
  port: string,
): string => {
  const value = required(env, name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (url.protocol !== "http:" || !localHosts.has(url.hostname) || url.port !== port) {
    throw new Error(`${name} must target a local service on port ${port}`);
  }
  return value;
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): NotificationWorkerConfig => ({
  awsEndpointUrl: localUrl(env, "AWS_ENDPOINT_URL", "4566"),
  awsRegion: env.AWS_REGION ?? "us-east-1",
  healthHost: env.HEALTH_HOST ?? "0.0.0.0",
  healthPort: integer(env, "HEALTH_PORT", 3_003, 1, 65_535),
  notificationQueueUrl: localUrl(env, "NOTIFICATION_QUEUE_URL", "4566"),
  notificationRecordsTableName: required(
    env,
    "NOTIFICATION_RECORDS_TABLE_NAME",
  ),
  otlpEndpointUrl: localUrl(env, "OTEL_EXPORTER_OTLP_ENDPOINT", "4318"),
  receiveWaitTimeSeconds: integer(
    env,
    "SQS_RECEIVE_WAIT_TIME_SECONDS",
    10,
    0,
    20,
  ),
});
