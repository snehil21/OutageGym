export interface AppConfig {
  host: string;
  port: number;
  awsEndpointUrl: string;
  awsRegion: string;
  orderQueueUrl: string;
}

const localAwsHosts = new Set(["floci", "localhost", "127.0.0.1"]);

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

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  host: env.HOST ?? "0.0.0.0",
  port: readPort(env),
  awsEndpointUrl: readLocalAwsUrl(env, "AWS_ENDPOINT_URL"),
  awsRegion: env.AWS_REGION ?? "us-east-1",
  orderQueueUrl: readLocalAwsUrl(env, "ORDER_QUEUE_URL"),
});
