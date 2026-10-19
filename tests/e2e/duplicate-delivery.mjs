import { randomUUID } from "node:crypto";

import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {
  GetQueueAttributesCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

const awsEndpointUrl = process.env.AWS_ENDPOINT_URL ?? "http://floci:4566";
const awsRegion = process.env.AWS_REGION ?? "us-east-1";
const orderProcessingQueueUrl = process.env.ORDER_PROCESSING_QUEUE_URL;
const orderRecordsTableName = process.env.ORDER_RECORDS_TABLE_NAME;

if (orderProcessingQueueUrl === undefined) {
  throw new Error("Missing required environment variable: ORDER_PROCESSING_QUEUE_URL");
}

if (orderRecordsTableName === undefined) {
  throw new Error("Missing required environment variable: ORDER_RECORDS_TABLE_NAME");
}

const timeoutMilliseconds = 45_000;
const pollIntervalMilliseconds = 250;

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const clientConfig = {
  endpoint: awsEndpointUrl,
  region: awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
};

const sqs = new SQSClient(clientConfig);
const dynamodb = new DynamoDBClient(clientConfig);

const orderId = `order-e2e-duplicate-${randomUUID()}`;
const correlationId = `correlation-e2e-duplicate-${randomUUID()}`;
const messageBody = JSON.stringify({
  schemaVersion: 1,
  orderId,
  correlationId,
  acceptedAt: new Date().toISOString(),
  productId: "product-e2e-duplicate-001",
  quantity: 2,
});

const publishMessage = async () => {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: orderProcessingQueueUrl,
      MessageBody: messageBody,
    }),
  );
};

const readOrderRecords = async () => {
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

const queueIsEmpty = async () => {
  const result = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: orderProcessingQueueUrl,
      AttributeNames: [
        "ApproximateNumberOfMessages",
        "ApproximateNumberOfMessagesNotVisible",
      ],
    }),
  );

  return (
    result.Attributes?.ApproximateNumberOfMessages === "0" &&
    result.Attributes?.ApproximateNumberOfMessagesNotVisible === "0"
  );
};

const waitForSettledOrder = async () => {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    const [records, empty] = await Promise.all([
      readOrderRecords(),
      queueIsEmpty(),
    ]);

    const order = records.find((record) => record.recordId?.S === "ORDER");

    if (records.length === 2 && order?.status?.S === "COMPLETED" && empty) {
      return records;
    }

    await pause(pollIntervalMilliseconds);
  }

  throw new Error(
    `Duplicate order ${orderId} did not settle within ${timeoutMilliseconds / 1_000} seconds`,
  );
};

try {
  await publishMessage();
  await waitForSettledOrder();

  await publishMessage();
  await pause(1_000);
  const records = await waitForSettledOrder();

  const recordIds = records.map((record) => record.recordId?.S).sort();

  if (recordIds.join(",") !== "FULFILMENT,ORDER") {
    throw new Error(`Unexpected records created: ${recordIds.join(",")}`);
  }

  const order = records.find((record) => record.recordId?.S === "ORDER");

  if (order?.status?.S !== "COMPLETED") {
    throw new Error(
      `Duplicate delivery changed order status to ${order?.status?.S}`,
    );
  }

  console.log(
    JSON.stringify({
      result: "passed",
      orderId,
      correlationId,
      deliveredMessages: 2,
      recordCount: records.length,
    }),
  );
} finally {
  sqs.destroy();
  dynamodb.destroy();
}
