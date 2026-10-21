# INC-003 Maintainer Notes — Spoilers

Do not read this file while participating in the incident.

## Intent

Teach that a client timeout does not prove an operation failed, and that retries
of state-changing requests require durable request-level idempotency.

## Planted causes

1. Selected requests publish successfully and then delay their HTTP response
   beyond the workload client's timeout.
2. Checkout request deduplication is disabled, so the retry publishes another
   order with a new order ID.

The two orders share an idempotency key but have different order and correlation
identifiers. Workers, SQS and DynamoDB remain healthy, which prevents the
incident from being misdiagnosed as an asynchronous-processing outage.

## Accepted recovery

- Immediate mitigation: reduce automatic retries or extend the client timeout
  while preserving evidence and communicating that outcomes may be ambiguous.
- Permanent repair: reserve each idempotency key durably before publishing,
  return the stored response for matching retries, and reject reuse with a
  different payload.

Deleting duplicates, disabling the delay without adding request idempotency, or
changing the grader is not a complete repair.

## Required outcomes

- One idempotency key produces one order and one fulfilment.
- Matching retries receive the original order and correlation identifiers.
- Conflicting reuse is rejected.
- The guarantee survives an Order API restart.
- Checkout latency and error signals return to baseline.

## Deterministic states

| State     | Response behavior                                 | Expected result                                |
| --------- | ------------------------------------------------- | ---------------------------------------------- |
| Broken    | Selected first attempts exceed the client timeout | Retry creates another order                    |
| Mitigated | Client retries are reduced or delayed             | New duplicates slow, ambiguous outcomes remain |
| Repaired  | Durable request idempotency enabled               | Retry returns the original accepted response   |

Reset restores disabled checkout idempotency, the deterministic response delay,
empty incident-scoped resources and the original learner workspace.
