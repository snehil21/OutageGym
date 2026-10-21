# OutageGym grader

The grader checks observable behaviour without requiring one prescribed repair.

Run the terminal assessment after implementing a repair:

```bash
make grade INCIDENT=inc-001
```

For machine-readable output, run the grader's JSON mode:

```bash
INCIDENT_ID=inc-001 docker compose \
  -p outagegym-inc-001 \
  -f compose.yaml \
  --profile tools run --rm grader \
  python -m outagegym_grader.report --format json
```

The automated result covers runtime safety, order completion, load recovery,
processing integrity, restart durability, and required document structure.
Written reasoning is always reported as `NOT REVIEWED` by automation.

## Written rubric review

Use the project-wide 100-point rubric for self-review or peer review:

| Area                            | Points |
| ------------------------------- | -----: |
| Triage and customer impact      |     20 |
| Diagnosis supported by evidence |     25 |
| Immediate mitigation            |     20 |
| Permanent repair                |     20 |
| Postmortem                      |     15 |

Reviewers should cite evidence from the worksheet and postmortem for every
score. A future AI-assisted review may offer suggestions, but it must remain
optional and non-authoritative; a person owns the written assessment.
