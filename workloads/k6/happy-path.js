import http from "k6/http";
import { check } from "k6";

const orders = JSON.parse(open("../data/orders.json"));
const orderApiUrl = __ENV.ORDER_API_URL;

if (!orderApiUrl) {
  throw new Error("Missing required environment variable: ORDER_API_URL");
}

export const options = {
  vus: 1,
  iterations: orders.length,
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const order = orders[__ITER];
  const response = http.post(`${orderApiUrl}/orders`, JSON.stringify(order), {
    headers: {
      "content-type": "application/json",
    },
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
}
