# INC-004 Maintainer Notes — Spoilers

Do not read this file while participating in the incident.

## Intent

Teach learners to distinguish permanent payload failures from transient
dependency failures and to use bounded redrive instead of infinite retry or
destructive deletion.

## Planted causes

1. Eight messages use an unsupported schema version and can never pass worker
   validation.
2. The order-processing queue has no redrive policy, so those messages return
   indefinitely after their short visibility timeout.

Expected evidence includes repeated failures for the same message identifiers,
increasing receive counts, retry telemetry, an empty dead-letter queue, no
records for the invalid payloads and delayed completion of valid orders.

## Accepted recovery

- Immediate mitigation: protect valid-order throughput while preserving the
  failed messages and their evidence.
- Permanent repair: enable the incident-scoped dead-letter queue with a bounded
  receive count. The worker must continue rejecting invalid messages rather
  than weakening validation.

Deleting messages, changing their payloads, accepting unsupported schemas,
disabling telemetry or increasing the visibility timeout without bounded
redrive is invalid.

## Required outcomes

- Valid workload orders complete.
- Invalid messages move to the dead-letter queue after three deliveries.
- Quarantined messages remain available for investigation.
- Invalid messages create no order or fulfilment records.
- Recovery survives an order-worker restart.
- Failure logs retain message identifiers and receive counts.

## Deterministic states

| State     | Redrive policy  | Expected result                              |
| --------- | --------------- | -------------------------------------------- |
| Broken    | Disabled        | Poison messages retry indefinitely           |
| Mitigated | Traffic guarded | Valid throughput improves; retries remain    |
| Repaired  | Three receives  | Poison messages are quarantined and retained |

Reset restores disabled redrive, eight malformed messages, a two-second
visibility timeout and an empty incident-scoped runtime.
