# INC-004: Order processing failures keep repeating

## Situation

Operations reports repeated order-processing failures for a small set of
messages. Most submitted orders are valid, but completion time is increasing as
the queue repeatedly presents messages that the worker cannot process.

The Order API remains available and continues accepting new orders.

## Initial signal

```text
OrderProcessingFailuresDetected is firing while valid-order completion slows.
```

## Your objectives

1. Quantify the impact on valid orders and identify the repeatedly failing messages.
2. Determine whether the failures are transient or permanent.
3. Record at least two hypotheses before changing the system.
4. Follow one failed message across queue state, worker logs and metrics.
5. Apply a reversible mitigation that protects valid-order throughput.
6. Implement a durable policy for messages that can never be processed.
7. Verify recovery under the supplied workload and after restarting the worker.
8. Complete the incident postmortem.

## Available investigation surfaces

- [Order Processing Overview dashboard](http://127.0.0.1:3002/d/outagegym-order-processing/order-processing-overview?from=now-15m&to=now&timezone=browser&refresh=5s).
- Prometheus metrics and alerts.
- Loki logs.
- AWS CLI through the local Floci tooling.
- Public application health endpoints.
- Learner-visible infrastructure and runtime configuration.

## Investigation constraint

Use operational evidence first. Do not inspect fault configuration, grader
implementation or maintainer documents until you have recorded an
evidence-backed diagnosis.

## Safety constraints

- Do not contact real AWS.
- Do not delete failing messages merely to silence the alert.
- Do not alter invalid payloads to make them appear valid.
- Do not bypass message validation.
- Do not disable the workload, telemetry or grader.
- Do not modify the grader or expected outcomes.
