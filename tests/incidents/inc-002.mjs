import assert from "node:assert/strict";

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  DescribeRuleCommand,
  EventBridgeClient,
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

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const scan = async (tableName) =>
  (
    await dynamodb.send(
      new ScanCommand({ TableName: tableName, ConsistentRead: true }),
    )
  ).Items ?? [];

const eventually = async (check, description) => {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
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
  const orders = await eventually(async () => {
    const items = (await scan(runtimeConfig.orderRecordsTableName)).filter(
      (item) => item.recordId?.S === "ORDER" && item.status?.S === "COMPLETED",
    );
    assert.equal(items.length, 4, "Expected four completed workload orders");
    return items;
  }, "Completed orders");

  const notifications = await eventually(async () => {
    const items = await scan(runtimeConfig.notificationRecordsTableName);
    assert.equal(items.length, 2, "Expected only two routed notifications");
    return items;
  }, "Partial notification delivery");

  assert.deepEqual(
    new Set(notifications.map((item) => item.notificationChannel?.S)),
    new Set(["EMAIL"]),
  );
  assert.equal(
    orders.filter((item) => item.notificationChannel?.S === "SMS").length,
    2,
  );

  const rule = await eventbridge.send(
    new DescribeRuleCommand({
      Name: "outagegym-inc-002-notification-routing",
      EventBusName: runtimeConfig.orderCompletionEventBusName,
    }),
  );
  const pattern = JSON.parse(rule.EventPattern ?? "{}");
  assert.deepEqual(pattern.detail.notificationChannel, ["EMAIL"]);

  console.log(
    JSON.stringify(
      {
        completedOrders: orders.length,
        deliveredNotifications: notifications.length,
        missingChannel: "SMS",
        status: "incident-reproduced",
      },
      null,
      2,
    ),
  );
} finally {
  dynamodb.destroy();
  eventbridge.destroy();
}
