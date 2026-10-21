import assert from "node:assert/strict";

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { runtimeConfig } from "../runtime-config.mjs";

const { awsEndpointUrl, awsRegion, orderRecordsTableName, prometheusUrl } =
  runtimeConfig;

const pause = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const requestJson = async (url) => {
  const response = await fetch(url);
  const body = await response.text();

  assert.equal(
    response.ok,
    true,
    `Request failed: ${url} returned ${response.status}: ${body}`,
  );

  return JSON.parse(body);
};

const eventually = async (check, description) => {
  let lastError;

  for (let attempt = 1; attempt <= 45; attempt += 1) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await pause(2_000);
    }
  }

  throw new Error(`${description} was not observed`, { cause: lastError });
};

const prometheusValue = async (expression) => {
  const query = new URLSearchParams({ query: expression });
  const response = await requestJson(`${prometheusUrl}/api/v1/query?${query}`);

  assert.equal(response.status, "success");
  assert.ok(
    response.data.result.length > 0,
    `No series found for ${expression}`,
  );

  return Number(response.data.result[0].value[1]);
};

const readAlert = async (name) => {
  const response = await requestJson(
    `${prometheusUrl}/api/v1/rules?type=alert`,
  );
  const rule = response.data.groups
    .flatMap((group) => group.rules)
    .find((candidate) => candidate.name === name);

  assert.ok(rule, `Alert rule is missing: ${name}`);
  assert.equal(rule.health, "ok", `Alert rule is unhealthy: ${name}`);

  return rule;
};

const dynamodb = new DynamoDBClient({
  endpoint: awsEndpointUrl,
  region: awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
});

const findDuplicateFulfilments = async () => {
  const result = await dynamodb.send(
    new ScanCommand({
      TableName: orderRecordsTableName,
      ConsistentRead: true,
    }),
  );
  const fulfilmentsByOrder = new Map();

  for (const item of result.Items ?? []) {
    if (item.recordType?.S !== "FULFILMENT" || item.orderId?.S === undefined) {
      continue;
    }

    fulfilmentsByOrder.set(
      item.orderId.S,
      (fulfilmentsByOrder.get(item.orderId.S) ?? 0) + 1,
    );
  }

  const duplicates = [...fulfilmentsByOrder.entries()].filter(
    ([, count]) => count > 1,
  );
  assert.ok(duplicates.length > 0, "No duplicate fulfilment was observed");

  return duplicates;
};

try {
  const [duplicates, backlogPeak, retryCount, completionAlert, retryAlert] =
    await Promise.all([
      eventually(findDuplicateFulfilments, "Duplicate fulfilment"),
      eventually(async () => {
        const value = await prometheusValue(
          'max_over_time(outagegym_worker_queue_messages{state="available"}[5m])',
        );
        assert.ok(value > 10, `Queue backlog peak was only ${value}`);
        return value;
      }, "Queue backlog"),
      eventually(async () => {
        const value = await prometheusValue(
          "outagegym_worker_retry_count_total",
        );
        assert.ok(value > 0, "No worker retries were recorded");
        return value;
      }, "Worker retry"),
      eventually(async () => {
        const rule = await readAlert("OrderCompletionRatioLow");
        assert.equal(rule.state, "firing");
        return rule;
      }, "Low completion alert"),
      eventually(async () => {
        const rule = await readAlert("OrderRetryVolumeElevated");
        assert.equal(rule.state, "firing");
        return rule;
      }, "Elevated retry alert"),
    ]);

  console.log(
    JSON.stringify(
      {
        alerts: [completionAlert.name, retryAlert.name],
        backlogPeak,
        duplicateOrderCount: duplicates.length,
        retryCount,
        status: "incident-reproduced",
      },
      null,
      2,
    ),
  );
} finally {
  dynamodb.destroy();
}
