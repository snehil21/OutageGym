import type { Logger as OtelLogger } from "@opentelemetry/api-logs";

export type LogFields = Record<string, unknown>;
export type LogLevel = "error" | "info" | "warn";

export interface StructuredLogger {
  error(event: string, message: string, fields?: LogFields): void;
  info(event: string, message: string, fields?: LogFields): void;
  warn(event: string, message: string, fields?: LogFields): void;
}

const otelAttributes = (
  fields: LogFields,
): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(fields).flatMap(([key, value]) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? [[key, value]]
        : [],
    ),
  );

export const describeError = (error: unknown): LogFields =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: error.message }
    : { errorName: "UnknownError", errorMessage: String(error) };

export const createStructuredLogger = (
  serviceName: string,
  otelLogger?: OtelLogger,
): StructuredLogger => {
  const write = (
    level: LogLevel,
    event: string,
    message: string,
    fields: LogFields = {},
  ): void => {
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      service: serviceName,
      event,
      ...fields,
    });

    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }

    otelLogger?.emit({
      body: message,
      severityText: level.toUpperCase(),
      attributes: { event, ...otelAttributes(fields) },
    });
  };

  return {
    error: (event, message, fields) => write("error", event, message, fields),
    info: (event, message, fields) => write("info", event, message, fields),
    warn: (event, message, fields) => write("warn", event, message, fields),
  };
};
