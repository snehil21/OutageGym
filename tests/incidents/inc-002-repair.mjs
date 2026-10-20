import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DescribeRuleCommand,
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

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
const eventbridge = new EventBridgeClient(clientConfig);
const phase = process.env.GRADE_PHASE ?? "initial";

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const submit = async (notificationChannel) => {
  const response = await fetch(`${runtimeConfig.orderApiUrl}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: `product-grade-${phase}-${notificationChannel.toLowerCase()}`,
      quantity: 1,
      notificationChannel,
    }),
  });
  const body = await response.text();
  assert.equal(response.status, 202, body);
  return JSON.parse(body);
};

const waitForNotification = async (orderId) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: runtimeConfig.notificationRecordsTableName,
        Key: { orderId: { S: orderId } },
        ConsistentRead: true,
      }),
    );
    if (result.Item !== undefined) {
      return result.Item;
    }
    await pause(1_000);
  }
  throw new Error(`Notification was not delivered for order ${orderId}`);
};

try {
  const rule = await eventbridge.send(
    new DescribeRuleCommand({
      Name: "outagegym-inc-002-notification-routing",
      EventBusName: runtimeConfig.orderCompletionEventBusName,
    }),
  );
  const channels = JSON.parse(rule.EventPattern ?? "{}").detail
    ?.notificationChannel;
  assert.deepEqual(
    new Set(channels),
    new Set(["EMAIL", "SMS"]),
    "Routing rule must include both supported notification channels",
  );

  const completedOrders = (
    await dynamodb.send(
      new ScanCommand({
        TableName: runtimeConfig.orderRecordsTableName,
        ConsistentRead: true,
      }),
    )
  ).Items?.filter(
    (item) => item.recordId?.S === "ORDER" && item.status?.S === "COMPLETED",
  ) ?? [];
  await Promise.all(
    completedOrders.map((item) =>
      waitForNotification(
        assertString(item.orderId?.S, "Completed order is missing orderId"),
      ),
    ),
  );

  const email = await submit("EMAIL");
  const sms = await submit("SMS");
  const [emailRecord, smsRecord] = await Promise.all([
    waitForNotification(email.orderId),
    waitForNotification(sms.orderId),
  ]);
  assert.equal(emailRecord.notificationChannel?.S, "EMAIL");
  assert.equal(smsRecord.notificationChannel?.S, "SMS");

  await eventbridge.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: runtimeConfig.orderCompletionEventBusName,
          Source: "outagegym.orders",
          DetailType: "OrderCompleted",
          Detail: JSON.stringify({
            schemaVersion: 1,
            orderId: email.orderId,
            correlationId: email.correlationId,
            completedAt: new Date().toISOString(),
            notificationChannel: "EMAIL",
          }),
        },
      ],
    }),
  );
  await pause(2_000);
  const unchanged = await waitForNotification(email.orderId);
  assert.equal(unchanged.deliveredAt?.S, emailRecord.deliveredAt?.S);

  console.log(
    JSON.stringify({
      channels: ["EMAIL", "SMS"],
      duplicatePrevented: true,
      phase,
      status: "passed",
    }),
  );
} finally {
  dynamodb.destroy();
  eventbridge.destroy();
}

function assertString(value, message) {
  assert.equal(typeof value, "string", message);
  return value;
}
