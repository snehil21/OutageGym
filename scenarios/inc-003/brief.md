# INC-003: Intermittent checkout failures

## Situation

Customers report that some checkout attempts time out. Retrying usually appears
to work, but support has also found multiple orders for a single intended
purchase. Other checkout requests complete normally.

The Order API remains healthy and workers continue processing orders.

## Initial signal

```text
Checkout latency is elevated and some customer retries produce multiple orders.
```

## Your objectives

1. Identify which requests are affected and quantify duplicate business orders.
2. Follow one checkout across API logs, the queue and persisted order records.
3. Record at least two hypotheses before changing the system.
4. Explain why the client-visible result differs from the backend result.
5. Apply a reversible mitigation.
6. Implement a durable repair for repeated checkout attempts.
7. Verify the repair after restarting the Order API.
8. Complete the incident postmortem.

## Available investigation surfaces

- [Checkout Reliability Overview dashboard](http://127.0.0.1:3002/d/outagegym-checkout-reliability/checkout-reliability-overview?from=now-15m&to=now&timezone=browser&refresh=5s).
- Prometheus metrics and alerts.
- Loki logs.
- AWS CLI through the local Floci tooling.
- Public application health endpoints.
- Learner-visible infrastructure and runtime configuration.

## Safety constraints

- Do not contact real AWS.
- Do not delete completed orders to hide duplicates.
- Do not disable the workload, telemetry or grader.
- Do not modify the grader or expected outcomes.
