# OutageGym Scoring Specification

## Scoring principles

- Treat scoring as supporting feedback, not the primary MVP outcome.
- Score observable outcomes and supplied evidence.
- Do not require one exact implementation.
- Separate incident mitigation from permanent repair.
- Give partial credit for correct reasoning even when implementation is incomplete.
- Reject repairs that hide symptoms by disabling traffic, telemetry, or validation.
- Keep deterministic checks authoritative for system behaviour.
- Do not present structural checks as a reliable assessment of written reasoning.

## Standard 100-point rubric

### Triage and customer impact — 20 points

| Criterion | Points |
|---|---:|
| Identifies the primary customer-visible symptom | 5 |
| Quantifies the affected traffic or records | 5 |
| Establishes an evidence-backed start time | 5 |
| Describes the blast radius and unaffected paths | 5 |

### Diagnosis supported by evidence — 25 points

| Criterion | Points |
|---|---:|
| States testable hypotheses before repair | 5 |
| Identifies the primary cause | 8 |
| Identifies contributing causes | 6 |
| Cites relevant logs, metrics, or configuration | 6 |

### Immediate mitigation — 20 points

| Criterion | Points |
|---|---:|
| Reduces active customer impact | 8 |
| Is reversible and preserves evidence | 4 |
| Avoids data loss and unsafe bypasses | 4 |
| Verifies that the mitigation helped | 4 |

### Permanent repair — 20 points

| Criterion | Points |
|---|---:|
| Restores required behavioural invariants | 10 |
| Survives service restart | 4 |
| Handles negative and retry cases | 3 |
| Does not weaken observability or safety | 3 |

### Postmortem — 15 points

| Criterion | Points |
|---|---:|
| Accurate impact and timeline | 4 |
| Separates root and contributing causes | 4 |
| Documents mitigation and permanent repair | 3 |
| Provides owned, testable prevention actions | 4 |

## Result bands

| Score | Result | Meaning |
|---|---|---|
| 90–100 | Excellent | Complete evidence, safe recovery, durable repair, and strong postmortem |
| 75–89 | Pass | Core incident resolved with acceptable evidence and verification |
| 50–74 | Partial | Meaningful diagnosis or mitigation, but important gaps remain |
| 0–49 | Not yet resolved | Customer impact, diagnosis, or repair remains substantially incomplete |

These result bands apply only when the written rubric has been reviewed by the learner, a peer, or another reviewer. The MVP grader does not automatically assign qualitative points for written reasoning.

A complete rubric result requires both:

- At least 75 total points.
- All mandatory behavioural invariants passing.

A high written score cannot compensate for a still-broken or unsafe system.

Without a written review, `make grade` reports the deterministic behavioural result and marks the written rubric as `NOT REVIEWED` rather than inventing a complete score.

## MVP assessment model

### Automated behavioural assessment

Use code to verify:

- Request and order completion rate.
- Duplicate side effects.
- Queue backlog recovery.
- Retry and failure behaviour.
- Data invariants.
- Behaviour after restart.
- Telemetry remains available.
- Real AWS is never contacted.

The automated result is `PASS` only when all mandatory behavioural invariants pass. Otherwise, it is `NOT YET RESOLVED` and lists the failed checks.

### Evidence checks

The learner supplies structured evidence in `evidence.md`. The MVP grader may validate required fields and referenced identifiers, but it does not claim that non-empty fields prove good reasoning. Evidence quality is self-reviewed or optionally reviewed by another person.

### Postmortem checks

The deterministic grader verifies required sections. Postmortem quality is self-reviewed or optionally reviewed by another person. A future AI-assisted evaluator must be optional, clearly labelled, and non-authoritative.

### Example MVP output

```text
Behavioural result: PASS
Automated checks: 12/12
Written rubric: NOT REVIEWED
```

## Anti-shortcut rules

The grader must fail or report an invalid result when it can detect that a learner:

- Stops the load generator to remove symptoms.
- Disables logs, metrics, or health checks.
- Deletes failed records instead of processing them safely.
- Modifies the grader or expected results.
- Hard-codes known test identifiers.
- Routes around the designated system path.
- Contacts real AWS.

Because the grader and expected outcomes are available locally, modifying them cannot be prevented completely. Doing so invalidates the result under the MVP honour-system boundary.

## `inc-001` provisional mandatory invariants

These are initial design targets. Their timing and percentage thresholds must be validated against healthy-baseline benchmarks before they become authoritative grader checks.

Under the supplied fixed workload:

- At least 99% of valid orders reach `COMPLETED` within 30 seconds.
- No valid order produces more than one fulfilment side effect.
- Queue age and depth return to baseline within 60 seconds after the load window.
- Invalid work follows the documented failure path without blocking valid orders.
- The repair remains effective after worker restart.
- Metrics, logs, and correlation IDs remain available.

These thresholds may be adjusted only with benchmark evidence and a recorded plan decision.
