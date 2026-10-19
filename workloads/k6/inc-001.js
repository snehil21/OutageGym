import execution from "k6/execution";
import http from "k6/http";
import { check, sleep } from "k6";

const orders = JSON.parse(open("../data/orders.json"));
const orderApiUrl = __ENV.ORDER_API_URL ?? "http://order-api:3000";
const arrivalRate = Number.parseInt(
  __ENV.INCIDENT_WORKLOAD_ARRIVAL_RATE ?? "2",
  10,
);
const durationSeconds = Number.parseInt(
  __ENV.INCIDENT_WORKLOAD_DURATION_SECONDS ?? "20",
  10,
);

if (!Number.isInteger(arrivalRate) || arrivalRate < 1) {
  throw new Error("INCIDENT_WORKLOAD_ARRIVAL_RATE must be a positive integer");
}

if (!Number.isInteger(durationSeconds) || durationSeconds < 1) {
  throw new Error(
    "INCIDENT_WORKLOAD_DURATION_SECONDS must be a positive integer",
  );
}

export const options = {
  scenarios: {
    warmup: {
      executor: "shared-iterations",
      exec: "submitWarmupOrder",
      vus: 1,
      iterations: 1,
      maxDuration: "5s",
    },
    incidentTraffic: {
      executor: "shared-iterations",
      exec: "submitIncidentOrder",
      startTime: "5s",
      vus: arrivalRate,
      iterations: arrivalRate * durationSeconds,
      maxDuration: `${durationSeconds + 10}s`,
    },
  },
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<1000"],
  },
};

const submitOrder = (order, phase) => {
  const response = http.post(`${orderApiUrl}/orders`, JSON.stringify(order), {
    headers: {
      "content-type": "application/json",
    },
    tags: { phase },
  });

  check(response, {
    "order accepted": (result) => result.status === 202,
    "response has order ID": (result) =>
      typeof result.json("orderId") === "string",
    "response has correlation ID": (result) =>
      typeof result.json("correlationId") === "string",
    "response status is accepted": (result) =>
      result.json("status") === "accepted",
  });
};

export function submitWarmupOrder() {
  submitOrder(orders[orders.length - 1], "warmup");
}

export function submitIncidentOrder() {
  const index = execution.scenario.iterationInTest % orders.length;
  submitOrder(orders[index], "incident");
  sleep(1);
}
