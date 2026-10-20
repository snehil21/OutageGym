export interface NotificationMessage {
  schemaVersion: 1;
  orderId: string;
  correlationId: string;
  completedAt: string;
  notificationChannel: "EMAIL" | "SMS";
}

const record = (value: unknown, name: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
};

const text = (value: Record<string, unknown>, name: string): string => {
  const field = value[name];
  if (typeof field !== "string" || field.trim() === "") {
    throw new Error(`Notification field ${name} must be a non-empty string`);
  }
  return field;
};

export const parseNotificationMessage = (body: string): NotificationMessage => {
  let envelope: Record<string, unknown>;
  try {
    envelope = record(JSON.parse(body), "EventBridge envelope");
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Notification message must be valid JSON");
    }
    throw error;
  }

  const detail = record(envelope.detail, "EventBridge detail");
  const channel = detail.notificationChannel;
  const completedAt = text(detail, "completedAt");

  if (detail.schemaVersion !== 1) {
    throw new Error("Notification schema version is unsupported");
  }
  if (channel !== "EMAIL" && channel !== "SMS") {
    throw new Error("Notification channel must be EMAIL or SMS");
  }
  if (Number.isNaN(Date.parse(completedAt))) {
    throw new Error("Notification completedAt must be a valid timestamp");
  }

  return {
    schemaVersion: 1,
    orderId: text(detail, "orderId"),
    correlationId: text(detail, "correlationId"),
    completedAt,
    notificationChannel: channel,
  };
};
