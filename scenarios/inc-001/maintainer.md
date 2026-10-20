# INC-001 Maintainer Notes — Spoilers

Do not read this file while participating in the incident.

## Intent

Teach learners to correlate queue timing, constrained throughput, retries, and
non-idempotent side effects rather than treating backlog and duplicates as
independent symptoms.

## Planted causes

1. Processing takes longer than the SQS visibility timeout, allowing redelivery.
2. The first storage implementation lacks a durable conditional idempotency
   guard, allowing duplicate fulfilment records.
3. Worker capacity is below the workload arrival rate, creating a backlog.

Expected evidence includes rising queue depth and age, repeated receives for one
order, duplicate fulfilments, worker saturation, and a healthy API.

## Accepted recovery

- Immediate mitigation: safely increase visibility timeout, then increase
  capacity or reduce intake through a documented control.
- Permanent repair: combine safe message visibility, durable idempotency, and
  enough capacity for the supplied workload.

Deleting messages, stopping traffic outside a supplied control, disabling
telemetry, or relying only on a longer visibility timeout is not a valid repair.

## Required outcomes

- At least 99% of valid orders complete within 30 seconds.
- Each order creates at most one fulfilment record.
- Queue age and depth recover within 60 seconds after the workload.
- Recovery survives a worker restart.
- Logs, metrics, and correlation IDs remain available.

## Validated states

| State | Visibility | Storage revision | Workers | Expected result |
|---|---:|---:|---:|---|
| Broken | 2 seconds | 1 | 2 | Backlog, retries, duplicates, and alerts |
| Mitigated | 10 seconds | 1 | 2 | Duplicates stop; backlog remains |
| Repaired | 10 seconds | 2 | 5 | All required outcomes pass |

Reset must restore the broken state, empty scenario resources, deterministic
data and timing, and the original learner workspace without silently discarding
learner work.
