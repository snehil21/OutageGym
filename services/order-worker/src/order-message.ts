export interface OrderMessage {
  schemaVersion: 1;
  orderId: string;
  correlationId: string;
  idempotencyKey?: string;
  acceptedAt: string;
  productId: string;
  quantity: number;
  notificationChannel: "EMAIL" | "SMS";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (
  value: Record<string, unknown>,
  name: string,
): string => {
  const field = value[name];

  if (typeof field !== "string" || field.trim() === "") {
    throw new Error(`Order message field ${name} must be a non-empty string`);
  }

  return field;
};

const readOptionalNonEmptyString = (
  value: Record<string, unknown>,
  name: string,
): string | undefined => {
  const field = value[name];

  if (field === undefined) {
    return undefined;
  }

  if (typeof field !== "string" || field.trim() === "") {
    throw new Error(`Order message field ${name} must be a non-empty string`);
  }

  return field;
};

export const parseOrderMessage = (body: string | undefined): OrderMessage => {
  if (body === undefined) {
    throw new Error("Order message body is missing");
  }

  let value: unknown;

  try {
    value = JSON.parse(body);
  } catch {
    throw new Error("Order message body must be valid JSON");
  }

  if (!isRecord(value)) {
    throw new Error("Order message body must be a JSON object");
  }

  if (value.schemaVersion !== 1) {
    throw new Error("Order message schema version is unsupported");
  }

  const acceptedAt = readNonEmptyString(value, "acceptedAt");
  const productId = readNonEmptyString(value, "productId");
  const quantity = value.quantity;
  const notificationChannel = value.notificationChannel ?? "EMAIL";
  const idempotencyKey = readOptionalNonEmptyString(value, "idempotencyKey");

  if (Number.isNaN(Date.parse(acceptedAt))) {
    throw new Error("Order message field acceptedAt must be a valid timestamp");
  }

  if (productId.length > 100) {
    throw new Error("Order message field productId must not exceed 100 characters");
  }

  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  ) {
    throw new Error("Order message field quantity must be an integer from 1 to 100");
  }

  if (notificationChannel !== "EMAIL" && notificationChannel !== "SMS") {
    throw new Error(
      "Order message field notificationChannel must be EMAIL or SMS",
    );
  }

  return {
    schemaVersion: 1,
    orderId: readNonEmptyString(value, "orderId"),
    correlationId: readNonEmptyString(value, "correlationId"),
    ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    acceptedAt,
    productId,
    quantity,
    notificationChannel,
  };
};
