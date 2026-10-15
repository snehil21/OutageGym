# INC-001: Orders are not completing reliably

## Situation

You are the on-call engineer for an order-processing service. A support escalation reports that some orders remain in `PROCESSING` longer than expected. A smaller number of customers report receiving duplicate fulfilment confirmations.

The issue began during normal traffic. There was no planned deployment or maintenance window.

## System overview

```text
Client -> Order API -> order queue -> Order Worker -> order store
                                                 `-> fulfilment record
```

## Initial alert

```text
OrderCompletionRate below expected threshold.
```

## Your objectives

1. Determine the customer impact and blast radius.
2. Establish when the incident began.
3. Record at least two initial hypotheses before changing the system.
4. Find evidence that supports or rejects each hypothesis.
5. Apply a reversible mitigation that reduces current impact.
6. Implement a permanent repair.
7. Verify recovery under the supplied workload and after restart.
8. Complete the incident postmortem.

## Available investigation surfaces

- Grafana dashboards.
- Prometheus metrics.
- Loki logs.
- AWS CLI through the provided local tooling, configured only for the Floci endpoint.
- Public application health endpoints.
- Learner-visible Terraform and runtime configuration.

## Investigation constraint

Use operational evidence first. Do not inspect application source, fault configuration, grader implementation, or maintainer documents until you have recorded an evidence-backed diagnosis.

## Safety constraints

- Do not contact real AWS.
- Do not stop or bypass the supplied workload except through a documented mitigation control.
- Do not disable logging or metrics.
- Do not modify the grader or expected outcomes.
- Do not delete affected orders to make the metrics appear healthy.
- Preserve evidence while mitigating the incident.
