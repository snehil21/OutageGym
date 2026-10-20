import assert from "node:assert/strict";

import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

import { runtimeConfig } from "../runtime-config.mjs";

const dynamodb = new DynamoDBClient({
  endpoint: runtimeConfig.awsEndpointUrl,
  region: runtimeConfig.awsRegion,
  credentials: {
    accessKeyId: "outagegym-local",
    secretAccessKey: "outagegym-local-only",
  },
});
const idempotencyKey = "inc003-grade-durable-checkout";
const requestBody = {
  productId: "product-inc003-timeout-grade",
  quantity: 2,
};

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const readReservation = async () =>
  (
    await dynamodb.send(
      new GetItemCommand({
        TableName: runtimeConfig.checkoutRequestsTableName,
        Key: { idempotencyKey: { S: idempotencyKey } },
        ConsistentRead: true,
      }),
    )
  ).Item;

const submit = async (body = requestBody) => {
  const response = await fetch(`${runtimeConfig.orderApiUrl}/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { response, text };
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

try {
  const existingBefore = await readReservation();

  if (existingBefore === undefined) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    try {
      await fetch(`${runtimeConfig.orderApiUrl}/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      assert.fail("The selected checkout did not exceed the client timeout");
    } catch (error) {
      assert.equal(error.name, "AbortError");
    } finally {
      clearTimeout(timeout);
    }
  }

  const firstRetry = await submit();
  assert.equal(firstRetry.response.status, 202, firstRetry.text);
  const firstBody = JSON.parse(firstRetry.text);

  const secondRetry = await submit();
  assert.equal(secondRetry.response.status, 202, secondRetry.text);
  const secondBody = JSON.parse(secondRetry.text);
  assert.deepEqual(secondBody, firstBody, "Retry response was not stable");

  const conflict = await submit({
    productId: "product-inc003-conflicting-reuse",
    quantity: 1,
  });
  assert.equal(conflict.response.status, 409, conflict.text);

  await pause(3_000);
  const records = await eventually(async () => {
    const items = (
      await dynamodb.send(
        new ScanCommand({
          TableName: runtimeConfig.orderRecordsTableName,
          ConsistentRead: true,
        }),
      )
    ).Items?.filter((item) => item.idempotencyKey?.S === idempotencyKey) ?? [];

    assert.ok(
      items.some((item) => item.recordId?.S === "ORDER"),
      "Order record is not available yet",
    );
    assert.ok(
      items.some((item) => item.recordType?.S === "FULFILMENT"),
      "Fulfilment record is not available yet",
    );
    return items;
  }, "One durable checkout result");

  assert.equal(
    records.filter((item) => item.recordId?.S === "ORDER").length,
    1,
    "One customer intent created more than one order",
  );
  assert.equal(
    records.filter((item) => item.recordType?.S === "FULFILMENT").length,
    1,
    "One customer intent created more than one fulfilment",
  );

  const reservation = await readReservation();
  assert.ok(reservation, "Checkout idempotency reservation is missing");
  assert.equal(reservation.orderId?.S, firstBody.orderId);
  assert.equal(reservation.correlationId?.S, firstBody.correlationId);

  console.log(
    JSON.stringify({
      conflictRejected: true,
      idempotencyKey,
      orderId: firstBody.orderId,
      persistedRecords: records.length,
      phase: process.env.GRADE_PHASE ?? "initial",
      status: "passed",
    }),
  );
} finally {
  dynamodb.destroy();
}
