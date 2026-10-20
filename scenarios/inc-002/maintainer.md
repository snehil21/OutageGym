# INC-002 Maintainer Notes — Spoilers

Do not read this file while participating in the incident.

## Intent

Teach learners to distinguish successful order processing from successful
downstream event delivery, and to compare application telemetry with event
routing configuration and persisted outcomes.

## Runtime path

```text
Order Worker -> EventBridge -> notification queue -> Notification Worker
                                                    `-> notification record
```

## Planted causes

1. The EventBridge rule routes `EMAIL` notification events but excludes `SMS`
   events, so affected events never reach the notification queue.
2. The producer reports events as published before downstream delivery is
   confirmed, masking the notification gap in top-level success telemetry.

Expected evidence includes completed orders for both channels, notification
records only for `EMAIL`, published-event metrics for both channels, no worker
failure for the missing `SMS` events, and an EventBridge rule pattern that does
not match the affected channel.

## Accepted recovery

- Immediate mitigation: safely expand the rule to route both supported
  channels, then replay only completed orders missing a notification record.
- Permanent repair: keep the complete rule pattern in the scenario-owned
  configuration and alert on persisted notification outcomes rather than
  publication alone.

Deleting affected orders, fabricating notification records, disabling
telemetry, or replaying every order without an idempotency guard is invalid.

## Required outcomes

- Every supplied completed order has exactly one notification record.
- Replaying an order cannot create a duplicate notification.
- Queue depth returns to baseline after recovery.
- Recovery survives a notification-worker restart.
- Order and correlation identifiers remain available in logs and metrics.

## Deterministic states

| State | Routed channels | Expected result |
|---|---|---|
| Broken | `EMAIL` | Email succeeds; SMS is missing |
| Mitigated | `EMAIL`, `SMS` plus targeted replay | All supplied orders recover |
| Repaired | Config-managed `EMAIL`, `SMS` | New and replayed events remain correct |

Reset must restore the incomplete rule, empty scenario resources, deterministic
seed data, and the original learner workspace.
