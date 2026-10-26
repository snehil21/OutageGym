import assert from "node:assert/strict";

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";

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

const requestJson = async (url) => {
  const response = await fetch(url);
  const body = await response.text();
  assert.equal(
    response.ok,
    true,
    `${url} returned ${response.status}: ${body}`,
  );
  return JSON.parse(body);
};

const prometheusValue = async (query) => {
  const parameters = new URLSearchParams({ query });
  const response = await requestJson(
    `${runtimeConfig.prometheusUrl}/api/v1/query?${parameters}`,
  );
  assert.equal(response.status, "success");
  assert.ok(response.data.result.length > 0, `No series found for ${query}`);
  return Number(response.data.result[0].value[1]);
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

try {
  const sourceQueue = await queueAttributes(
    runtimeConfig.orderProcessingQueueUrl,
  );
  assert.equal(
    sourceQueue.RedrivePolicy,
    undefined,
    "Broken state unexpectedly has a redrive policy",
  );

  const [failures, retries] = await Promise.all([
    eventually(async () => {
      const value = await prometheusValue(
        "outagegym_worker_processing_failure_count_total",
      );
      assert.ok(value >= 8, `Only ${value} processing failures were observed`);
      return value;
    }, "Repeated poison-message failures"),
    eventually(async () => {
      const value = await prometheusValue(
        'outagegym_worker_retry_count_total{result="failed"}',
      );
      assert.ok(value > 0, "No failed retry delivery was recorded");
      return value;
    }, "Failed retry delivery"),
  ]);

  const records = await dynamodb.send(
    new ScanCommand({
      TableName: runtimeConfig.orderRecordsTableName,
      ConsistentRead: true,
    }),
  );
  const completedOrders = (records.Items ?? []).filter(
    (item) =>
      item.recordId?.S === "ORDER" &&
      item.status?.S === "COMPLETED" &&
      item.productId?.S?.startsWith("product-inc004-valid-"),
  ).length;
  assert.ok(
    completedOrders < 8,
    "Broken state unexpectedly completed every valid workload order",
  );
  assert.equal(
    (records.Items ?? []).some(
      (item) => item.productId?.S === "product-inc004-poison",
    ),
    false,
    "Invalid payload created an order record",
  );

  const deadLetterQueue = await queueAttributes(
    runtimeConfig.orderProcessingDeadLetterQueueUrl,
  );
  assert.equal(
    Number(deadLetterQueue.ApproximateNumberOfMessages ?? "0"),
    0,
    "Broken state unexpectedly quarantined poison messages",
  );

  const remaining = await queueAttributes(
    runtimeConfig.orderProcessingQueueUrl,
  );
  assert.ok(
    Number(remaining.ApproximateNumberOfMessages ?? "0") +
      Number(remaining.ApproximateNumberOfMessagesNotVisible ?? "0") >
      0,
    "Poison messages unexpectedly left the source queue",
  );

  const alert = await eventually(async () => {
    const response = await requestJson(
      `${runtimeConfig.prometheusUrl}/api/v1/rules?type=alert`,
    );
    const rule = response.data.groups
      .flatMap((group) => group.rules)
      .find(
        (candidate) => candidate.name === "OrderProcessingFailuresDetected",
      );
    assert.ok(rule, "OrderProcessingFailuresDetected alert is missing");
    assert.equal(rule.health, "ok");
    assert.equal(rule.state, "firing");
    return rule.name;
  }, "Processing-failure alert");

  console.log(
    JSON.stringify(
      {
        alert,
        completedOrders,
        failures,
        quarantinedMessages: 0,
        retries,
        status: "incident-reproduced",
      },
      null,
      2,
    ),
  );
} finally {
  dynamodb.destroy();
  sqs.destroy();
}
