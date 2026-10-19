import type { Meter } from "@opentelemetry/api";
import type { Logger } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";

export interface Telemetry {
  meter: Meter;
  logger: Logger;
  shutdown(): Promise<void>;
}

export const createTelemetry = (
  otlpEndpoint: string,
  serviceName: string,
): Telemetry => {
  const endpoint = otlpEndpoint.replace(/\/$/, "");
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_NAMESPACE]: "outagegym",
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${endpoint}/v1/metrics`,
        }),
        exportIntervalMillis: 5_000,
      }),
    ],
  });

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${endpoint}/v1/logs`,
        }),
      }),
    ],
  });

  return {
    meter: meterProvider.getMeter(serviceName),
    logger: loggerProvider.getLogger(serviceName),
    shutdown: async () => {
      await Promise.all([
        meterProvider.shutdown(),
        loggerProvider.shutdown(),
      ]);
    },
  };
};
