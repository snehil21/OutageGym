# Incident Authoring

Incidents should test operational reasoning, not filename recognition or
solution copying.

## Design rules

- Begin with a customer symptom or alert, never the diagnosis.
- Use opaque IDs such as `inc-002`; avoid names such as `broken-dlq`.
- Make every required conclusion discoverable through operational evidence.
- Include a reversible mitigation distinct from the permanent repair.
- Keep seed data, workload, timing, and fault activation deterministic.
- Grade observable outcomes rather than one expected code change.
- Reset must restore the same initial broken state.
- Use only local endpoints, fake credentials, and synthetic data.

An incident should take the learner through detection, triage, diagnosis,
mitigation, repair, verification, and a postmortem. Difficulty comes from the
reasoning required and evidence that must be correlated—not container count.

## Create a scenario

```bash
make new-incident ID=inc-002
```

The command creates and validates `scenarios/inc-002/`. Customize:

| File | Purpose |
|---|---|
| `manifest.yaml` | Identity, resources, interfaces, and required outcomes |
| `brief.md` | Learner-visible symptom, topology, objectives, and constraints |
| `evidence.md` | Investigation worksheet |
| `postmortem-template.md` | Written incident review |
| `seed/data.json` | Deterministic starting data |
| `fault-config/runtime.env` | Non-spoiling runtime configuration |
| `hooks/*.sh` | Optional lifecycle, fault, seed, or grading behaviour |

The manifest must match `schemas/scenario-manifest.schema.json`, and its ID must
match the directory name.

## Extension points

- Put scenario traffic in `workloads/k6/<incident-id>.js`; otherwise the shared
  happy-path workload is used.
- Put incident verification in `tests/incidents/<incident-id>.mjs`.
- Put executable lifecycle hooks in `scenarios/<incident-id>/hooks/`. Their
  contract is documented in [Scenario Interfaces](SCENARIO_INTERFACES.md).
- Add `hooks/grade.sh` only when the shared grader cannot express the outcome.

Prefer these interfaces over scenario-specific conditionals in shared platform
code.

## Assessment

Automated grading verifies behaviour, data invariants, recovery, restart
durability, telemetry, and local-only AWS access. It must reject detected
shortcuts such as disabling traffic or telemetry, deleting failed work, changing
the grader, or routing around the intended system.

Written reasoning uses this human-reviewed rubric:

| Area | Points |
|---|---:|
| Triage and customer impact | 20 |
| Diagnosis supported by evidence | 25 |
| Immediate mitigation | 20 |
| Permanent repair | 20 |
| Postmortem | 15 |

A complete pass requires every mandatory behavioural invariant and at least
75/100 after human review. Automation reports written work as `NOT REVIEWED`;
it does not invent a qualitative score from filled fields.

## Validate before publishing

```bash
make validate-scenarios
tests/runtime/scenario-authoring.sh
tests/runtime/scenario-hooks.sh
make start INCIDENT=inc-002
make workload INCIDENT=inc-002
make grade INCIDENT=inc-002
make reset INCIDENT=inc-002
make stop INCIDENT=inc-002
```

Confirm that:

- An uninformed tester can reproduce and diagnose the symptom without source
  inspection.
- Learner-facing text contains no diagnosis or repair spoilers.
- Required conclusions have evidence and safe repairs satisfy the grader.
- Ports bind to localhost; no secrets, privileged containers, or runtime socket
  mounts were added.
- Repeated workloads and resets produce equivalent results.
- The scenario cannot alter another scenario or unrelated host resources.
