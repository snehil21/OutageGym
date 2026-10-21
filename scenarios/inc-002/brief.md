# INC-002: Completed orders are missing customer notifications

## Situation

Customer support reports that some customers can see their orders complete but
never receive a confirmation notification. Other completed orders continue to
produce notifications normally.

The issue began during normal traffic. The Order API remains available, and the
affected orders do not appear to be stuck in processing.

## System overview

```text
Client -> Order API -> order processing -> event routing
                                      `-> notification queue
                                          `-> Notification Worker
                                              `-> notification record
```

## Initial signal

```text
Completed orders exist without matching customer notification records.
```

## Your objectives

1. Determine which completed orders are affected.
2. Establish where the notification flow stops.
3. Record at least two hypotheses before changing the system.
4. Correlate application telemetry with local AWS resource state.
5. Apply a reversible mitigation for affected notifications.
6. Implement and verify a permanent repair.
7. Confirm recovery after restarting the notification processor.
8. Complete the incident postmortem.

## Available investigation surfaces

- [Notification Delivery Overview dashboard](http://127.0.0.1:3002/d/outagegym-notification-delivery/notification-delivery-overview?from=now-15m&to=now&timezone=browser&refresh=5s).
- Prometheus metrics.
- Loki logs.
- AWS CLI through the local Floci tooling.
- Public application health endpoints.
- Learner-visible infrastructure and runtime configuration.

## Investigation constraint

Use operational evidence first. Do not inspect fault configuration, grader
implementation, or maintainer documents until you have recorded an
evidence-backed diagnosis.

## Safety constraints

- Do not contact real AWS.
- Do not delete completed orders or notification evidence.
- Do not disable logging, metrics, or the supplied workload.
- Do not modify the grader or expected outcomes.
