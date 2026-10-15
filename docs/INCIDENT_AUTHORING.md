# Incident Authoring Guide

## Purpose

This guide defines how OutageGym incidents are designed so that they test operational reasoning rather than filename recognition or solution copying.

## Authoring principles

1. Begin with an observable customer or operational symptom.
2. Never put the diagnosis in the scenario ID, service name, dashboard title, alert name, environment variable, or learner-facing comment.
3. Every required conclusion must have discoverable evidence.
4. Include at least one safe, reversible mitigation.
5. Grade outcomes and invariants rather than an expected diff.
6. Make time, traffic, data, and fault activation deterministic.
7. Make reset restore the defined initial broken state.
8. Do not require real cloud credentials or public service calls during incident execution.

## Scenario identity

Use opaque IDs:

```text
inc-001
inc-002
inc-003
```

Avoid diagnostic names such as `lambda-timeout`, `broken-dlq`, or `sqs-duplicate-processing`.

## Required incident lifecycle

### Detect

Provide an initial alert or customer report. It should identify that something is wrong without identifying why.

### Triage

Require the learner to determine impact, blast radius, start time, affected paths, and urgency.

### Diagnose

Require explicit hypotheses. Each important cause must have at least two useful evidence sources where practical, such as one metric and one log or configuration observation.

### Mitigate

Provide at least one reversible way to reduce present harm. Mitigation should not be identical to the permanent repair.

### Repair

Allow more than one correct implementation when behavioural invariants can be preserved.

### Verify

Test the repaired system under the original workload, after restart, and against negative cases.

### Write postmortem

Require impact, timeline, root and contributing causes, mitigation, repair, detection gaps, and owned prevention actions.

## Learner-visible package

Every scenario must include:

```text
scenarios/<incident-id>/
├── manifest.yaml
├── brief.md
├── evidence.md
└── postmortem-template.md
```

The learner-visible manifest must contain only non-spoiling metadata and lifecycle configuration. Diagnostic fault configuration belongs in maintainer-controlled files.

Learner-visible material may contain:

- Customer reports.
- Alert text.
- System topology at the level expected in a real on-call handoff.
- Available investigation tools.
- Safety constraints.
- Scoring categories.

It must not contain:

- Root-cause names.
- Exact repair instructions.
- Spoiling variable names.
- Dashboard panels named after failures.
- Comments explaining planted defects.

## Maintainer package

Maintainer material records:

- Planted root and contributing causes.
- Activation mechanism.
- Expected symptoms.
- Required evidence.
- Valid mitigations.
- Valid permanent repairs.
- Behavioural invariants.
- Reset requirements.
- False-positive and shortcut checks.

Maintainer material is visible in a public local repository, so the MVP uses an honour-system boundary. Learners should be warned before entering it.

## Difficulty review

An incident is not advanced merely because it has more containers. Difficulty comes from reasoning complexity:

- Number of interacting causes.
- Ambiguity of initial symptoms.
- Number of evidence sources that must be correlated.
- Quality of misleading but truthful signals.
- Repair trade-offs.
- Verification depth.

## Determinism checklist

- [ ] Fixed seed data.
- [ ] Controlled traffic rate.
- [ ] Fault activation uses a controlled, repeatable condition.
- [ ] Pseudo-random data uses a fixed seed.
- [ ] Time-dependent behaviour uses controlled or relative timestamps.
- [ ] No dependency on public services.
- [ ] Reset removes scenario state and volumes.
- [ ] Repeated runs produce equivalent symptoms and scores.

## Safety checklist

- [ ] AWS endpoint is local and validated.
- [ ] Credentials are fake.
- [ ] Ports bind to localhost.
- [ ] No privileged container is required.
- [ ] Docker socket is not mounted unless separately reviewed and documented.
- [ ] No secrets or personal data are included.
- [ ] Destructive actions are limited to scenario-owned resources.

## Acceptance checklist

Before publishing an incident:

- [ ] An uninformed tester can reproduce the initial symptom.
- [ ] The tester can diagnose it without source inspection.
- [ ] Each required conclusion has evidence.
- [ ] Partial repairs receive partial credit.
- [ ] Superficial workarounds fail.
- [ ] At least two safe correct repairs are accepted where feasible.
- [ ] Restart verification passes after a correct repair.
- [ ] Reset restores the defined initial broken state.
- [ ] Learner-facing text contains no diagnosis spoilers.
