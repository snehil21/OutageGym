import assert from "node:assert/strict";

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { runtimeConfig } from "../runtime-config.mjs";

const {
  awsEndpointUrl,
  awsRegion,
  orderProcessingQueueUrl,
  orderRecordsTableName,
  prometheusUrl,
} = runtimeConfig;

const pause = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const clientConfig = {
  endpoint: awsEndpointUrl,
  region: awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
};

const dynamodb = new DynamoDBClient(clientConfig);
const sqs = new SQSClient(clientConfig);

const readState = async () => {
  const [table, queue] = await Promise.all([
    dynamodb.send(
      new ScanCommand({
        TableName: orderRecordsTableName,
        ConsistentRead: true,
      }),
    ),
    sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: orderProcessingQueueUrl,
        AttributeNames: [
          "ApproximateNumberOfMessages",
          "ApproximateNumberOfMessagesNotVisible",
          "VisibilityTimeout",
        ],
      }),
    ),
  ]);
  const orders = [];
  const fulfilmentsByOrder = new Map();

  for (const item of table.Items ?? []) {
    if (item.recordType?.S === "ORDER") {
      orders.push(item);
    }

    if (item.recordType?.S === "FULFILMENT" && item.orderId?.S !== undefined) {
      fulfilmentsByOrder.set(
        item.orderId.S,
        (fulfilmentsByOrder.get(item.orderId.S) ?? 0) + 1,
      );
    }
  }

  return {
    completedOrders: orders.filter((item) => item.status?.S === "COMPLETED")
      .length,
    duplicateOrders: [...fulfilmentsByOrder.values()].filter(
      (count) => count > 1,
    ).length,
    fulfilmentRecords: [...fulfilmentsByOrder.values()].reduce(
      (total, count) => total + count,
      0,
    ),
    queueAvailable: Number(
      queue.Attributes?.ApproximateNumberOfMessages ?? "0",
    ),
    queueInFlight: Number(
      queue.Attributes?.ApproximateNumberOfMessagesNotVisible ?? "0",
    ),
    visibilityTimeout: Number(queue.Attributes?.VisibilityTimeout ?? "0"),
  };
};

const waitForSettledState = async () => {
  let state;

  for (let attempt = 1; attempt <= 45; attempt += 1) {
    state = await readState();

    if (
      state.completedOrders === 41 &&
      state.queueAvailable === 0 &&
      state.queueInFlight === 0
    ) {
      return state;
    }

    await pause(2_000);
  }

  throw new Error("Mitigated workload did not settle", { cause: state });
};

const prometheusValue = async (expression) => {
  const query = new URLSearchParams({ query: expression });
  const response = await fetch(`${prometheusUrl}/api/v1/query?${query}`);
  const body = await response.text();

  assert.equal(
    response.ok,
    true,
    `Prometheus returned ${response.status}: ${body}`,
  );

  const result = JSON.parse(body).data.result;
  return result.length === 0 ? 0 : Number(result[0].value[1]);
};

try {
  const state = await waitForSettledState();
  const [backlogPeak, retryCount] = await Promise.all([
    prometheusValue(
      'max_over_time(outagegym_worker_queue_messages{state="available"}[5m])',
    ),
    prometheusValue("outagegym_worker_retry_count_total"),
  ]);

  assert.equal(state.visibilityTimeout, 10);
  assert.equal(state.fulfilmentRecords, 41);
  assert.equal(state.duplicateOrders, 0);
  assert.equal(retryCount, 0);
  assert.ok(backlogPeak > 10, `Queue backlog peak was only ${backlogPeak}`);

  console.log(
    JSON.stringify(
      {
        backlogPeak,
        completedOrders: state.completedOrders,
        duplicateOrders: state.duplicateOrders,
        fulfilmentRecords: state.fulfilmentRecords,
        retryCount,
        status: "partial-mitigation-verified",
        visibilityTimeout: state.visibilityTimeout,
      },
      null,
      2,
    ),
  );
} finally {
  dynamodb.destroy();
  sqs.destroy();
}
