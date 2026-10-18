import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const orderApiUrl = process.env.ORDER_API_URL ?? "http://order-api:3000";
const awsEndpointUrl = process.env.AWS_ENDPOINT_URL ?? "http://floci:4566";
const awsRegion = process.env.AWS_REGION ?? "us-east-1";
const orderRecordsTableName =
  process.env.ORDER_RECORDS_TABLE_NAME ?? "outagegym-inc-001-order-records";

const expectedProductId = "product-e2e-001";
const expectedQuantity = 3;
const timeoutMilliseconds = 20_000;
const pollIntervalMilliseconds = 250;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const dynamodb = new DynamoDBClient({
  endpoint: awsEndpointUrl,
  region: awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
});

const submitOrder = async () => {
  const response = await fetch(`${orderApiUrl}/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      productId: expectedProductId,
      quantity: expectedQuantity,
    }),
  });

  const body = await response.json();

  assert(response.status === 202, `Expected HTTP 202, received ${response.status}`);
  assert(typeof body.orderId === "string", "Response is missing orderId");
  assert(
    typeof body.correlationId === "string",
    "Response is missing correlationId",
  );
  assert(body.status === "accepted", "Response status is not accepted");

  return body;
};

const readOrderRecords = async (orderId) => {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: orderRecordsTableName,
      KeyConditionExpression: "orderId = :orderId",
      ExpressionAttributeValues: {
        ":orderId": { S: orderId },
      },
      ConsistentRead: true,
    }),
  );

  return result.Items ?? [];
};

const waitForCompletedOrder = async (orderId) => {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    const records = await readOrderRecords(orderId);

    if (records.length === 2) {
      return records;
    }

    await pause(pollIntervalMilliseconds);
  }

  throw new Error(`Order ${orderId} did not complete within 20 seconds`);
};

const verifyRecords = (records, response) => {
  const order = records.find((record) => record.recordId?.S === "ORDER");
  const fulfilment = records.find(
    (record) => record.recordId?.S === "FULFILMENT",
  );

  assert(order !== undefined, "ORDER record is missing");
  assert(fulfilment !== undefined, "FULFILMENT record is missing");
  assert(order.status?.S === "COMPLETED", "Order did not reach COMPLETED");
  assert(order.productId?.S === expectedProductId, "Product ID was not preserved");
  assert(
    order.quantity?.N === String(expectedQuantity),
    "Order quantity was not preserved",
  );
  assert(
    order.correlationId?.S === response.correlationId,
    "ORDER correlation ID does not match the API response",
  );
  assert(
    fulfilment.correlationId?.S === response.correlationId,
    "FULFILMENT correlation ID does not match the API response",
  );
};

try {
  const response = await submitOrder();
  const records = await waitForCompletedOrder(response.orderId);

  verifyRecords(records, response);

  console.log(
    JSON.stringify({
      result: "passed",
      orderId: response.orderId,
      correlationId: response.correlationId,
      recordCount: records.length,
    }),
  );
} finally {
  dynamodb.destroy();
}
