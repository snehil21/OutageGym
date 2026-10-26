const required = (name) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const localUrl = (name, allowedHosts, expectedPort) => {
  const value = required(name);
  let url;

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
    throw new Error(`${name} must target its local OutageGym service`);
  }

  return value.replace(/\/$/, "");
};

const loopbackHosts = new Set(["localhost", "127.0.0.1"]);

export const runtimeConfig = Object.freeze({
  awsEndpointUrl: localUrl(
    "AWS_ENDPOINT_URL",
    new Set(["floci", ...loopbackHosts]),
    "4566",
  ),
  awsRegion: required("AWS_REGION"),
  grafanaUrl: localUrl(
    "GRAFANA_URL",
    new Set(["grafana", ...loopbackHosts]),
    "3000",
  ),
  lokiUrl: localUrl("LOKI_URL", new Set(["loki", ...loopbackHosts]), "3100"),
  orderApiUrl: localUrl(
    "ORDER_API_URL",
    new Set(["order-api", ...loopbackHosts]),
    "3000",
  ),
  orderProcessingQueueUrl: localUrl(
    "ORDER_PROCESSING_QUEUE_URL",
    new Set(["floci", ...loopbackHosts]),
    "4566",
  ),
  orderProcessingDeadLetterQueueUrl: localUrl(
    "ORDER_PROCESSING_DLQ_URL",
    new Set(["floci", ...loopbackHosts]),
    "4566",
  ),
  orderRecordsTableName: required("ORDER_RECORDS_TABLE_NAME"),
  checkoutRequestsTableName: required("CHECKOUT_REQUESTS_TABLE_NAME"),
  orderCompletionEventBusName: required("ORDER_COMPLETION_EVENT_BUS_NAME"),
  notificationQueueUrl: localUrl(
    "NOTIFICATION_QUEUE_URL",
    new Set(["floci", ...loopbackHosts]),
    "4566",
  ),
  notificationRecordsTableName: required("NOTIFICATION_RECORDS_TABLE_NAME"),
  otelCollectorHealthUrl: localUrl(
    "OTEL_COLLECTOR_HEALTH_URL",
    new Set(["otel-collector", ...loopbackHosts]),
    "13133",
  ),
  prometheusUrl: localUrl(
    "PROMETHEUS_URL",
    new Set(["prometheus", ...loopbackHosts]),
    "9090",
  ),
});
