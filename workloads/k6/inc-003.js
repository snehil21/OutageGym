import http from "k6/http";
import { check } from "k6";

const { orders } = JSON.parse(open("/scenarios/inc-003/seed/data.json"));
const orderApiUrl = __ENV.ORDER_API_URL;

if (!orderApiUrl) {
  throw new Error("Missing required environment variable: ORDER_API_URL");
}

export const options = {
  vus: 1,
  iterations: orders.length,
  thresholds: {
    checks: ["rate==1"],
  },
};

const submit = (order, timeout) =>
  http.post(
    `${orderApiUrl}/orders`,
    JSON.stringify({ productId: order.productId, quantity: order.quantity }),
    {
      headers: {
        "content-type": "application/json",
        "idempotency-key": order.idempotencyKey,
      },
      timeout,
    },
  );

export default function () {
  const order = orders[__ITER % orders.length];
  const first = submit(order, order.expectTimeout ? "500ms" : "5s");

  if (!order.expectTimeout) {
    check(first, {
      "normal checkout is accepted": (result) => result.status === 202,
    });
    return;
  }

  check(first, {
    "affected checkout exceeds the client timeout": (result) =>
      result.status === 0,
  });

  const retry = submit(order, "5s");
  check(retry, {
    "checkout retry is accepted": (result) => result.status === 202,
    "retry returns an order ID": (result) =>
      typeof result.json("orderId") === "string",
  });
}
