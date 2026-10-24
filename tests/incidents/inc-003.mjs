import assert from "node:assert/strict";

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

import { runtimeConfig } from "../runtime-config.mjs";

const dynamodb = new DynamoDBClient({
  endpoint: runtimeConfig.awsEndpointUrl,
  region: runtimeConfig.awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
});

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const scan = async (tableName) =>
  (
    await dynamodb.send(
      new ScanCommand({ TableName: tableName, ConsistentRead: true }),
    )
  ).Items ?? [];

try {
  const orders = await eventually(async () => {
    const items = (await scan(runtimeConfig.orderRecordsTableName)).filter(
      (item) =>
        item.recordId?.S === "ORDER" &&
        item.status?.S === "COMPLETED" &&
        item.productId?.S?.startsWith("product-inc003-"),
    );
    assert.equal(items.length, 6, "Expected six completed backend orders");
    return items;
  }, "Ambiguous checkout outcomes");

  const countsByKey = new Map();
  for (const item of orders) {
    const key = item.idempotencyKey?.S;
    assert.ok(key, "Completed order is missing its idempotency key");
    countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
  }

  assert.deepEqual(
    [...countsByKey.values()].sort(),
    [1, 1, 2, 2],
    "Expected two customer intents to produce duplicate orders",
  );

  const reservations = await scan(runtimeConfig.checkoutRequestsTableName);
  assert.equal(
    reservations.length,
    0,
    "Broken state should not reserve checkout idempotency keys",
  );

  const alert = await eventually(async () => {
    const rules = await requestJson(
      `${runtimeConfig.prometheusUrl}/api/v1/rules?type=alert`,
    );
    const checkoutAlert = rules.data.groups
      .flatMap((group) => group.rules)
      .find((rule) => rule.name === "CheckoutLatencyHigh");
    assert.ok(checkoutAlert, "CheckoutLatencyHigh alert is missing");
    assert.equal(checkoutAlert.health, "ok");
    assert.equal(checkoutAlert.state, "firing");
    return checkoutAlert;
  }, "Checkout latency alert");

  console.log(
    JSON.stringify(
      {
        backendOrders: orders.length,
        customerIntents: countsByKey.size,
        duplicatedIntents: [...countsByKey.values()].filter(
          (count) => count > 1,
        ).length,
        alert: alert.name,
        status: "incident-reproduced",
      },
      null,
      2,
    ),
  );
} finally {
  dynamodb.destroy();
}
