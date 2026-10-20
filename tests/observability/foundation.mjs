import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { runtimeConfig } from "../runtime-config.mjs";

const {
  grafanaUrl,
  lokiUrl,
  orderApiUrl,
  otelCollectorHealthUrl,
  prometheusUrl,
} = runtimeConfig;

const request = async (url) => {
  const response = await fetch(url);
  const body = await response.text();

  assert.equal(
    response.ok,
    true,
    `Request failed: ${url} returned ${response.status}: ${body}`,
  );

  return body;
};

const requestJson = async (url) => JSON.parse(await request(url));

const pause = async (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const eventually = async (check, description) => {
  let lastError;

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await pause(1_000);
    }
  }

  throw new Error(`${description} was not observed`, { cause: lastError });
};

const prometheusQuery = async (expression) => {
  const query = new URLSearchParams({ query: expression });
  const response = await requestJson(
    `${prometheusUrl}/api/v1/query?${query}`,
  );

  assert.equal(response.status, "success");
  assert.ok(response.data.result.length > 0, `No series found for ${expression}`);

  return response.data.result;
};

const lokiQuery = async (expression) => {
  const query = new URLSearchParams({
    query: expression,
    limit: "1",
  });
  const response = await requestJson(
    `${lokiUrl}/loki/api/v1/query_range?${query}`,
  );

  assert.equal(response.status, "success");
  assert.ok(response.data.result.length > 0, `No logs found for ${expression}`);

  return response.data.result;
};

assert.match(
  await request(`${prometheusUrl}/-/ready`),
  /ready/i,
);
assert.match(await request(`${lokiUrl}/ready`), /ready/i);

const collectorHealth = await requestJson(`${otelCollectorHealthUrl}/`);
assert.equal(collectorHealth.status, "Server available");

const grafanaHealth = await requestJson(`${grafanaUrl}/api/health`);
assert.equal(grafanaHealth.database, "ok");

const dashboard = await requestJson(
  `${grafanaUrl}/api/dashboards/uid/outagegym-order-processing`,
);
assert.equal(dashboard.dashboard.title, "Order Processing Overview");
const panelTitles = new Set(
  dashboard.dashboard.panels.map((panel) => panel.title),
);

for (const title of [
  "Order API Throughput",
  "Order API P95 Latency",
  "Worker Outcomes",
  "Queue Depth",
  "Worker Operational Events",
  "Correlated Order Timeline",
]) {
  assert.ok(
    panelTitles.has(title),
    `Required dashboard panel is missing: ${title}`,
  );
}

const ruleResponse = await requestJson(
  `${prometheusUrl}/api/v1/rules?type=alert`,
);
const alertGroup = ruleResponse.data.groups.find(
  (group) => group.name === "outagegym-order-processing",
);
assert.ok(alertGroup, "OutageGym order-processing alert group is missing");
const alertRules = alertGroup.rules;
const alertsByName = new Map(alertRules.map((rule) => [rule.name, rule]));

for (const name of [
  "OrderCompletionRatioLow",
  "OrderQueueBacklogHigh",
  "OrderProcessingFailuresDetected",
  "OrderRetryVolumeElevated",
]) {
  const rule = alertsByName.get(name);
  assert.ok(rule, `Required alert rule is missing: ${name}`);
  assert.equal(rule.health, "ok", `Alert rule is unhealthy: ${name}`);
}

const testId = randomUUID();
const orderResponse = await fetch(`${orderApiUrl}/orders`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    productId: `product-observability-${testId}`,
    quantity: 1,
  }),
});
const orderBody = await orderResponse.text();
assert.equal(
  orderResponse.status,
  202,
  `Order submission failed with ${orderResponse.status}: ${orderBody}`,
);
const order = JSON.parse(orderBody);
assert.equal(typeof order.correlationId, "string");
assert.equal(typeof order.orderId, "string");

const [, , , apiLogs, workerLogs] = await Promise.all([
  eventually(
    () => prometheusQuery("outagegym_api_request_count_total"),
    "Order API request metrics",
  ),
  eventually(
    () => prometheusQuery("outagegym_worker_processing_count_total"),
    "Order worker processing metrics",
  ),
  eventually(
    () => prometheusQuery("outagegym_worker_queue_messages"),
    "Order queue metrics",
  ),
  eventually(
    () =>
      lokiQuery(
        `{service_name="order-api"} | correlationId="${order.correlationId}"`,
      ),
    "Order API logs",
  ),
  eventually(
    () =>
      lokiQuery(
        `{service_name="order-worker"} | correlationId="${order.correlationId}"`,
      ),
    "Order worker logs",
  ),
]);

for (const [serviceName, streams] of [
  ["order-api", apiLogs],
  ["order-worker", workerLogs],
]) {
  assert.ok(
    streams.some(
      (stream) =>
        stream.stream.correlationId === order.correlationId &&
        stream.stream.orderId === order.orderId,
    ),
    `${serviceName} did not preserve the submitted order and correlation IDs`,
  );
}

console.log(
  JSON.stringify(
    {
      alerts: alertRules.map((rule) => ({
        health: rule.health,
        name: rule.name,
        state: rule.state,
      })),
      dashboard: dashboard.dashboard.title,
      logs: ["order-api", "order-worker"],
      metrics: [
        "outagegym_api_request_count_total",
        "outagegym_worker_processing_count_total",
        "outagegym_worker_queue_messages",
      ],
      correlationId: order.correlationId,
      orderId: order.orderId,
      status: "ok",
    },
    null,
    2,
  ),
);
