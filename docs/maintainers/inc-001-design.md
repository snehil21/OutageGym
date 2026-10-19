# INC-001 Maintainer Design — Spoilers

> Do not read this document while participating in the incident.

## Learning objective

Teach the learner to correlate queue timing, constrained throughput, retries, and non-idempotent side effects rather than treating duplicate processing and backlog as independent symptoms.

## System

```text
k6 -> Order API -> SQS -> TypeScript worker -> DynamoDB
                                      |
                                      `-> fulfilment side-effect record
```

## Intended interacting causes

1. The SQS visibility timeout is shorter than the worker's controlled processing duration, making in-flight work visible again.
2. The worker performs the fulfilment side effect without a durable conditional idempotency guard, so a redelivered message can repeat the side effect.
3. Worker concurrency is intentionally below the supplied arrival rate, increasing message age and making the timeout/redelivery behaviour more visible.

Implementation details must use neutral names. Do not name variables `BROKEN_VISIBILITY_TIMEOUT`, `MISSING_IDEMPOTENCY`, or similar.

## Deterministic activation sequence

The incident workload must expose both redelivery and sustained backlog predictably:

1. Start at least two worker execution slots.
2. Submit a controlled warm-up order so one slot processes it while another remains available to poll.
3. Keep the processing duration longer than the visibility timeout so the available slot can receive the warm-up order again before the first attempt completes.
4. Begin sustained traffic at a rate above total worker capacity to create measurable queue age and depth.

The exact timing values must be established through the healthy-baseline benchmark and verified against Floci during the compatibility spike.

## Expected evidence

- Queue depth and age rise under the fixed workload.
- Processing duration exceeds the configured visibility timeout.
- The same message or order correlation ID appears in more than one receive attempt.
- Duplicate fulfilment side effects share an order ID but have distinct processing attempts.
- Worker saturation is visible while the API remains healthy.
- DynamoDB order state alone may appear valid even when the side effect is duplicated.

## Valid immediate mitigations

- First, increase the visibility timeout to safely exceed expected processing time and reduce redelivery risk.
- After visibility handling is safe, increase worker capacity within documented local resource limits to drain the backlog.
- If a provided traffic-control mechanism exists, temporarily reduce new intake while preserving queued work and telemetry. This is only a partial mitigation and must not replace recovery.

Stopping traffic outside the provided control, deleting messages, or disabling telemetry is not valid.

## Valid permanent repairs

A complete repair must combine safe message-lifecycle handling, durable idempotency, and enough processing capacity for the supplied workload. Accept multiple implementations, including:

- A DynamoDB conditional write that records only one fulfilment side effect per order and operation.
- An idempotency record keyed by order and operation with an atomic condition.
- A transaction that atomically records processing and the fulfilment decision.
- A visibility timeout or visibility-extension strategy that covers the expected processing duration.
- A worker-capacity or processing-efficiency change that keeps service rate above the supplied arrival rate.

For the MVP, fulfilment is represented by a durable local record so its invariant can be tested without an external service. The repair must not claim exactly-once SQS processing or rely only on increasing visibility timeout. SQS delivery remains at-least-once; idempotency provides an effectively-once business outcome.

## Mandatory repair invariants

- At least 99% of valid orders complete within 30 seconds under the fixed load.
- Each valid order produces at most one fulfilment side effect.
- Queue age and depth return to baseline within 60 seconds after the load window.
- Repair survives worker restart.
- Telemetry and correlation remain intact.

## Validated recovery checkpoints

The fixed 41-order workload produced these repeatable checkpoints:

| State | Visibility | Storage revision | Workers | Expected result |
|---|---:|---:|---:|---|
| Broken baseline | 2 seconds | 1 | 2 | Backlog, retries, duplicate fulfilments, and both incident alerts |
| Immediate mitigation | 10 seconds | 1 | 2 | No retries or duplicate fulfilments; backlog still exceeds the alert threshold |
| Complete repair | 10 seconds | 2 | 5 | One fulfilment per order, no retries, backlog below the alert threshold, and every order completes within 30 seconds |

The complete repair was also verified by restarting every worker and processing a new order without losing idempotency or correlation.

## Partial-credit expectations

- Visibility adjustment without idempotency: mitigation credit, incomplete permanent repair.
- Idempotency without adequate throughput or message lifecycle: duplicate protection credit, incomplete recovery.
- Correct diagnosis without implementation: diagnosis and postmortem credit only.
- Disabling the side effect: no permanent-repair credit.

## Reset requirements

Reset must restore:

- Original scenario-owned queue and table configuration.
- Original generated worker and runtime configuration.
- A fresh repair workspace created from the immutable broken baseline.
- Empty scenario-owned queues and tables.
- Deterministic seed data and traffic timing.
- Initial dashboards.

Before recreating the repair workspace, reset must archive learner-authored source changes, evidence, and postmortem work. It must never silently discard learner work.
