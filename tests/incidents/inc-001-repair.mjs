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
    orders,
    fulfilmentsByOrder,
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

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    state = await readState();
    const completedOrders = state.orders.filter(
      (item) => item.status?.S === "COMPLETED",
    );

    if (
      completedOrders.length === 41 &&
      state.queueAvailable === 0 &&
      state.queueInFlight === 0
    ) {
      return { ...state, completedOrders };
    }

    await pause(1_000);
  }

  throw new Error("Repaired workload did not settle", { cause: state });
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
  const completionDurations = state.completedOrders.map((item) => {
    const acceptedAt = Date.parse(item.acceptedAt?.S ?? "");
    const completedAt = Date.parse(item.completedAt?.S ?? "");

    assert.ok(Number.isFinite(acceptedAt), "Order acceptedAt is invalid");
    assert.ok(Number.isFinite(completedAt), "Order completedAt is invalid");

    return (completedAt - acceptedAt) / 1_000;
  });
  const duplicateOrders = [...state.fulfilmentsByOrder.values()].filter(
    (count) => count > 1,
  ).length;
  const fulfilmentRecords = [...state.fulfilmentsByOrder.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const maximumCompletionSeconds = Math.max(...completionDurations);

  assert.equal(state.visibilityTimeout, 10);
  assert.equal(fulfilmentRecords, 41);
  assert.equal(duplicateOrders, 0);
  assert.equal(retryCount, 0);
  assert.ok(backlogPeak <= 10, `Queue backlog peak reached ${backlogPeak}`);
  assert.ok(
    maximumCompletionSeconds <= 30,
    `Slowest completion took ${maximumCompletionSeconds} seconds`,
  );

  console.log(
    JSON.stringify(
      {
        backlogPeak,
        completedOrders: state.completedOrders.length,
        duplicateOrders,
        fulfilmentRecords,
        maximumCompletionSeconds,
        retryCount,
        status: "repair-verified",
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
