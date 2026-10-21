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

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): NotificationWorkerConfig => ({
  awsEndpointUrl: readLocalUrl(
    env,
    "AWS_ENDPOINT_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  awsRegion: env.AWS_REGION ?? DEFAULT_AWS_REGION,
  healthHost: env.HEALTH_HOST ?? DEFAULT_BIND_HOST,
  healthPort: readInteger(env, "HEALTH_PORT", 3_003, 1, 65_535),
  notificationQueueUrl: readLocalUrl(
    env,
    "NOTIFICATION_QUEUE_URL",
    LOCAL_AWS_HOSTS,
    LOCAL_AWS_PORT,
    "Floci",
  ),
  notificationRecordsTableName: readRequired(
    env,
    "NOTIFICATION_RECORDS_TABLE_NAME",
  ),
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
