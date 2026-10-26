import assert from "node:assert/strict";

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import { runtimeConfig } from "../runtime-config.mjs";

const clientConfig = {
  endpoint: runtimeConfig.awsEndpointUrl,
  region: runtimeConfig.awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
};
const dynamodb = new DynamoDBClient(clientConfig);
const sqs = new SQSClient(clientConfig);
const phase = process.env.GRADE_PHASE ?? "initial";
const productId = `product-inc004-grade-${phase}`;
const poisonBody = JSON.stringify({
  schemaVersion: 99,
  orderId: `inc004-grade-poison-${phase}`,
  correlationId: `inc004-grade-poison-${phase}`,
  acceptedAt: "2026-10-26T00:00:00.000Z",
  productId: "product-inc004-poison",
  quantity: 1,
});

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const eventually = async (check, description) => {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await pause(1_000);
    }
  }
  throw new Error(`${description} was not observed`, { cause: lastError });
};

const queueAttributes = async (queueUrl) =>
  (
    await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [
          "ApproximateNumberOfMessages",
          "ApproximateNumberOfMessagesNotVisible",
          "RedrivePolicy",
        ],
      }),
    )
  ).Attributes ?? {};

const deadLetterDepth = async () =>
  Number(
    (await queueAttributes(runtimeConfig.orderProcessingDeadLetterQueueUrl))
      .ApproximateNumberOfMessages ?? "0",
  );

try {
  const sourceAttributes = await queueAttributes(
    runtimeConfig.orderProcessingQueueUrl,
  );
  assert.ok(sourceAttributes.RedrivePolicy, "Redrive policy is not enabled");
  const redrivePolicy = JSON.parse(sourceAttributes.RedrivePolicy);
  assert.equal(Number(redrivePolicy.maxReceiveCount), 3);
  assert.match(redrivePolicy.deadLetterTargetArn, /order-processing-dlq$/);

  const baselineDepth = await deadLetterDepth();

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: runtimeConfig.orderProcessingQueueUrl,
      MessageBody: poisonBody,
    }),
  );

  const response = await fetch(`${runtimeConfig.orderApiUrl}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, quantity: 2 }),
  });
  const responseText = await response.text();
  assert.equal(response.status, 202, responseText);
  const acceptedOrder = JSON.parse(responseText);
  assert.equal(typeof acceptedOrder.orderId, "string");

  const quarantinedMessages = await eventually(async () => {
    const depth = await deadLetterDepth();
    assert.ok(
      depth > baselineDepth,
      `Dead-letter depth ${depth} did not exceed baseline ${baselineDepth}`,
    );
    return depth;
  }, "Poison-message quarantine");

  const records = await eventually(async () => {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: runtimeConfig.orderRecordsTableName,
        ConsistentRead: true,
      }),
    );
    const matching = (result.Items ?? []).filter(
      (item) => item.orderId?.S === acceptedOrder.orderId,
    );
    assert.equal(
      matching.filter((item) => item.recordId?.S === "ORDER").length,
      1,
      "Valid order did not complete exactly once",
    );
    assert.equal(
      matching.filter((item) => item.recordType?.S === "FULFILMENT").length,
      1,
      "Valid fulfilment was not created exactly once",
    );
    assert.equal(
      (result.Items ?? []).some(
        (item) => item.productId?.S === "product-inc004-poison",
      ),
      false,
      "Poison payload created a business record",
    );
    return matching.length;
  }, "Valid order completion");

  const quarantined = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: runtimeConfig.orderProcessingDeadLetterQueueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      VisibilityTimeout: 0,
    }),
  );
  assert.ok(
    quarantined.Messages?.some((message) => {
      try {
        return JSON.parse(message.Body ?? "{}").schemaVersion === 99;
      } catch {
        return false;
      }
    }),
    "Quarantined payload is not inspectable",
  );

  console.log(
    JSON.stringify({
      maxReceiveCount: 3,
      persistedRecords: records,
      phase,
      quarantinedMessages,
      status: "passed",
    }),
  );
} finally {
  dynamodb.destroy();
  sqs.destroy();
}
