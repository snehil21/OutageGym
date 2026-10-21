export const DEFAULT_AWS_REGION = "us-east-1";
export const DEFAULT_BIND_HOST = "0.0.0.0";
export const LOCAL_AWS_PORT = "4566";
export const LOCAL_OTLP_PORT = "4318";
export const SERVICE_NAMESPACE = "outagegym";

export const LOCAL_AWS_HOSTS: ReadonlySet<string> = new Set([
  "floci",
  "localhost",
  "127.0.0.1",
]);

export const LOCAL_OTLP_HOSTS: ReadonlySet<string> = new Set([
  "otel-collector",
  "localhost",
  "127.0.0.1",
]);

const LOCAL_AWS_ACCESS_KEY_ID = "outagegym-local";
const LOCAL_AWS_SECRET_ACCESS_KEY = "outagegym-local-only";

export const createLocalAwsCredentials = () => ({
  accessKeyId: LOCAL_AWS_ACCESS_KEY_ID,
  secretAccessKey: LOCAL_AWS_SECRET_ACCESS_KEY,
});
