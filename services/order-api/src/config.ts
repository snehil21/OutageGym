export interface AppConfig {
  host: string;
  port: number;
  awsEndpointUrl: string;
  awsRegion: string;
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
