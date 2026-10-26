import http from "k6/http";
import { check } from "k6";

const { orders } = JSON.parse(open("/scenarios/inc-004/seed/data.json"));
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
  },
};

export default function () {
  const order = orders[__ITER % orders.length];
  const response = http.post(`${orderApiUrl}/orders`, JSON.stringify(order), {
    headers: { "content-type": "application/json" },
  });

  check(response, {
    "valid order is accepted": (result) => result.status === 202,
    "response contains an order ID": (result) =>
      typeof result.json("orderId") === "string",
  });
}
