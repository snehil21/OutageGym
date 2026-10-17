export interface WorkerConfig {
  awsEndpointUrl: string;
  awsRegion: string;
  healthHost: string;
  healthPort: number;
  orderProcessingQueueUrl: string;
  orderRecordsTableName: string;
  receiveWaitTimeSeconds: number;
}

const localAwsHosts = new Set(["floci", "localhost", "127.0.0.1"]);

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

const readLocalAwsUrl = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = readRequired(env, name);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (
    url.protocol !== "http:" ||
    !localAwsHosts.has(url.hostname) ||
    url.port !== "4566"
  ) {
    throw new Error(`${name} must target the local Floci endpoint on port 4566`);
  }

  return value;
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): WorkerConfig => ({
  awsEndpointUrl: readLocalAwsUrl(env, "AWS_ENDPOINT_URL"),
  awsRegion: env.AWS_REGION ?? "us-east-1",
  healthHost: env.HEALTH_HOST ?? "0.0.0.0",
  healthPort: readInteger(env, "HEALTH_PORT", 3_001, 1, 65_535),
  orderProcessingQueueUrl: readLocalAwsUrl(
    env,
    "ORDER_PROCESSING_QUEUE_URL",
  ),
  orderRecordsTableName: readRequired(env, "ORDER_RECORDS_TABLE_NAME"),
  receiveWaitTimeSeconds: readInteger(
    env,
    "SQS_RECEIVE_WAIT_TIME_SECONDS",
    10,
    0,
    20,
  ),
});
