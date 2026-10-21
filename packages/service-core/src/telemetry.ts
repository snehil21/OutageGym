import type { Meter } from "@opentelemetry/api";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";

import { SERVICE_NAMESPACE } from "./constants.js";
import { createStructuredLogger, type StructuredLogger } from "./logger.js";

export interface Telemetry {
  logger: StructuredLogger;
  meter: Meter;
  shutdown(): Promise<void>;
}

export const createTelemetry = (
  otlpEndpoint: string,
  serviceName: string,
): Telemetry => {
  const endpoint = otlpEndpoint.replace(/\/$/, "");
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_NAMESPACE]: SERVICE_NAMESPACE,
  });
  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: 5_000,
      }),
    ],
  });
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
      }),
    ],
  });

  return {
    logger: createStructuredLogger(
      serviceName,
      loggerProvider.getLogger(serviceName),
    ),
    meter: meterProvider.getMeter(serviceName),
    shutdown: async () => {
      await Promise.all([meterProvider.shutdown(), loggerProvider.shutdown()]);
    },
  };
};
