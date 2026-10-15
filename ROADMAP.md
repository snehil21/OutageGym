# OutageGym Implementation Plan

> A living implementation plan for a local, reproducible incident-response practice platform.
>
> Last updated: 2026-10-15

## How to use this plan

- Check an item only after its result has been verified.
- Add links to code, tests, decisions, or evidence beside completed items.
- Do not start a new phase merely because the previous phase has code; its exit criteria must pass.
- Record changes in the changelog at the bottom of this file.
- Keep learner-visible incident material free of root-cause spoilers.

Status legend:

- `[ ]` Not started
- `[~]` Drafted and awaiting review
- `[x]` Complete and verified
- `[-]` Intentionally deferred or removed from scope

## Project outcome

A user should be able to clone the repository and run:

```bash
make start INCIDENT=inc-001
```

The command should launch a deterministic, production-like broken system. The user investigates it using logs, metrics, AWS-compatible tools, and infrastructure configuration; applies a repair; submits a postmortem; and receives a deterministic behavioural result with written-rubric review status. The complete environment can be restored with:

```bash
make reset INCIDENT=inc-001
```

## Working project identity

- Working repository name: `OutageGym`
- Display name: **OutageGym**
- Working tagline: **Production incidents you can diagnose and fix locally.**

## MVP boundaries

### Included

- [ ] One complete AWS-oriented incident: `inc-001`
- [ ] Docker Compose orchestration
- [ ] Floci for local AWS-compatible services
- [ ] Terraform for infrastructure provisioning
- [ ] TypeScript application services
- [ ] Metrics and centralized logs
- [ ] Repeatable load generation
- [ ] Automated behavioural assessment
- [ ] Postmortem submission and rubric
- [ ] Makefile-based lifecycle commands
- [ ] Local-only execution
- [ ] macOS and Linux support
- [ ] CI smoke testing

### Explicitly outside the MVP

- [-] Kubernetes
- [-] Browser-based terminal
- [-] Web application or dashboard owned by OutageGym
- [-] User accounts
- [-] Payments or subscriptions
- [-] Remote hidden grader
- [-] Signed or recruiter-visible verification
- [-] Multiplayer sessions
- [-] Windows-native support outside WSL
- [-] Multiple incidents before `inc-001` is reliable

## Technical direction

| Layer | MVP technology | Purpose |
|---|---|---|
| Local orchestration | Docker Compose | Start and isolate the complete lab |
| AWS emulation | Floci, version pinned | Provide local AWS-compatible APIs |
| Infrastructure as code | Terraform | Provision incident resources |
| Application services | Node.js 22 and TypeScript | Implement lightweight APIs and workers |
| AWS client | AWS SDK for JavaScript v3 | Communicate with Floci |
| Metrics | Prometheus | Store operational metrics |
| Logs | Loki | Centralize searchable logs |
| Investigation UI | Grafana | Explore metrics and logs |
| Instrumentation | OpenTelemetry | Correlation and telemetry pipeline |
| Traffic | k6 | Generate deterministic workloads |
| Grader | Python, pytest, and boto3 | Test behaviour and calculate scores |
| Scenario format | YAML validated by JSON Schema | Describe incident packs |
| Local commands | Makefile and small shell scripts | Provide a consistent user workflow |
| CI | GitHub Actions | Validate runtime and scenarios |
| Image distribution | GitHub Container Registry | Publish versioned service images |

## Architectural principles

- Build one complete vertical slice before creating a generic scenario framework.
- Grade observable behaviour and invariants, not exact source-code changes.
- Reveal symptoms and evidence to learners, not root-cause names.
- Keep application code, platform infrastructure, fault injection, and assessment separate.
- Make every incident deterministic and fully resettable.
- Use fake AWS credentials and prevent accidental requests to real AWS.
- Bind exposed services to `127.0.0.1` by default.
- Avoid privileged containers and Docker socket mounts unless a documented scenario requires them.
- Pin container images and important tool versions.
- Treat Floci as AWS-compatible, not behaviourally identical to production AWS.

## Scenario naming policy

Scenario directories must not disclose their diagnosis:

```text
scenarios/
├── inc-001/
├── inc-002/
└── inc-003/
```

The learner brief may reveal realistic initial symptoms, such as a customer complaint or alert, but filenames, service names, dashboards, environment variables, and commands must not announce the planted fault.

Avoid names such as:

```text
lambda-timeout
broken-dlq
sqs-duplicate-processing
```

## Standard learner workflow

```bash
make doctor
make list
make start INCIDENT=inc-001
make status
make grade INCIDENT=inc-001
make reset INCIDENT=inc-001
make stop
```

## Standard scoring model

| Area | Points |
|---|---:|
| Triage and customer impact | 20 |
| Diagnosis supported by evidence | 25 |
| Immediate mitigation | 20 |
| Permanent repair | 20 |
| Postmortem | 15 |
| **Total** | **100** |

---

## Phase 0 — Product and incident specification

**Goal:** Define what the first useful version teaches and how success is measured.

### Tasks

- [x] Define the primary learner persona. See `docs/PRODUCT.md`.
- [x] Define beginner, intermediate, and advanced difficulty characteristics. See `docs/PRODUCT.md`.
- [x] Define what learners may inspect during each stage. See `docs/PRODUCT.md`.
- [x] Define what learners may modify. See `docs/PRODUCT.md`.
- [x] Define the incident lifecycle:
  - [x] Detect
  - [x] Triage
  - [x] Diagnose
  - [x] Mitigate
  - [x] Repair
  - [x] Verify
  - [x] Write postmortem
- [x] Finalize the common 100-point review rubric. See `docs/SCORING.md`.
- [x] Write the learner-visible `inc-001` brief using symptoms only. See `scenarios/inc-001/brief.md`.
- [x] Document the internal causes and expected evidence separately. See `docs/maintainers/inc-001-design.md`.
- [x] Document initial CPU, memory, disk, Docker, and Terraform targets that require later validation. See `docs/PRODUCT.md`.
- [x] Decide how the honour-system source and assessment boundaries work. See `docs/PRODUCT.md`.

### Deliverables

- [x] `docs/PRODUCT.md`
- [x] `docs/INCIDENT_AUTHORING.md`
- [x] `docs/SCORING.md`
- [x] `docs/architecture/adr-001-mvp-scope.md`
- [x] Internal design for `inc-001`: `docs/maintainers/inc-001-design.md`
- [x] Learner brief: `scenarios/inc-001/brief.md`
- [x] Evidence worksheet: `scenarios/inc-001/evidence.md`
- [x] Postmortem template: `scenarios/inc-001/postmortem-template.md`

### Exit criteria

- [x] The complete learner journey is documented.
- [x] The public brief reveals symptoms but not the diagnosis.
- [x] Behavioural pass/fail and optional rubric-review outcomes are unambiguous.
- [x] Initial resource targets and their validation requirement are documented.

---

## Phase 1 — Floci feasibility spike

**Goal:** Verify the required AWS-compatible behaviour before depending on it.

### Compatibility checks

- [ ] Start a pinned Floci image through Docker Compose.
- [ ] Configure AWS CLI against `http://localhost:4566`.
- [ ] Configure the JavaScript AWS SDK against Floci.
- [ ] Configure boto3 against Floci.
- [ ] Configure Terraform against Floci.
- [ ] Create and use an SQS standard queue.
- [ ] Verify SQS visibility timeout behaviour.
- [-] Dead-letter queue and redrive behaviour — deferred to a later incident.
- [-] Lambda invocation — deferred because `inc-001` uses a continuously running worker.
- [ ] Create a DynamoDB table.
- [ ] Verify DynamoDB conditional writes.
- [-] CloudWatch logs — deferred because `inc-001` uses Loki.
- [-] CloudWatch metrics and alarms — deferred because `inc-001` uses Prometheus.
- [ ] Verify persistence and clean reset behaviour.
- [ ] Determine which selected features require Docker socket access.
- [ ] Test on both ARM64 and AMD64 where possible.

### Safety checks

- [ ] Use obviously fake AWS credentials.
- [ ] Add a guard that rejects non-local AWS endpoints.
- [ ] Confirm the spike makes no calls to real AWS.
- [ ] Bind Floci to localhost only.
- [ ] Document any Docker socket requirement and its risk.

### Deliverables

- [ ] `spikes/floci-compatibility/compose.yaml`
- [ ] `spikes/floci-compatibility/terraform/`
- [ ] `spikes/floci-compatibility/tests/`
- [ ] Floci compatibility matrix
- [ ] Recorded go/no-go decision

### Exit criteria

- [ ] Every operation needed by `inc-001` works predictably.
- [ ] Startup and reset succeed repeatedly.
- [ ] No real AWS account is required.
- [ ] A fallback is documented for every required unsupported behaviour.

---

## Phase 2 — Repository and runtime foundation

**Goal:** Establish a safe and repeatable local runtime.

### Repository foundation

- [x] Initialize the Git repository.
- [x] Configure the GitHub `origin` remote.
- [ ] Add license.
- [ ] Add `.gitignore` and `.dockerignore` files.
- [ ] Add initial README.
- [ ] Establish formatting and linting conventions.
- [ ] Add contribution guidelines.

### Runtime

- [ ] Create the base `compose.yaml`.
- [ ] Define isolated Docker networks.
- [ ] Add the pinned Floci service.
- [ ] Add container health checks.
- [ ] Add named and scenario-scoped volumes.
- [ ] Add CPU and memory limits where portable.
- [ ] Bind public ports to `127.0.0.1`.
- [ ] Add generated local environment configuration.
- [ ] Add deterministic teardown and volume cleanup.

### Commands

- [ ] Implement `make doctor`.
- [ ] Implement `make start`.
- [ ] Implement `make status`.
- [ ] Implement `make stop`.
- [ ] Implement `make reset`.
- [ ] Make commands fail with actionable error messages.

### CI

- [ ] Add GitHub Actions workflow.
- [ ] Validate Docker Compose configuration.
- [ ] Validate Terraform formatting and configuration.
- [ ] Run a headless startup smoke test.
- [ ] Verify cleanup after CI execution.

### Exit criteria

- [ ] A fresh clone starts with one documented command.
- [ ] Reset produces identical infrastructure and data.
- [ ] Stop leaves no unexpected running resources.
- [ ] CI passes without real AWS credentials.

---

## Phase 3 — Healthy application baseline

**Goal:** Build and verify a correct order-processing system before injecting faults.

### Proposed baseline

```text
Client -> Order API -> SQS order queue -> Order worker -> DynamoDB
```

### Tasks

- [ ] Build the TypeScript Order API.
- [ ] Build the TypeScript Order Worker.
- [ ] Implement AWS SDK endpoint configuration.
- [ ] Implement SQS publishing and consumption.
- [ ] Implement DynamoDB order persistence.
- [ ] Implement idempotent order processing.
- [ ] Add correlation IDs.
- [ ] Add structured JSON logs.
- [ ] Add health and readiness endpoints.
- [ ] Add graceful shutdown.
- [ ] Build versioned Docker images.
- [ ] Add deterministic seed data.
- [ ] Add a k6 baseline workload.
- [ ] Add end-to-end happy-path tests.

### Exit criteria

- [ ] Orders consistently reach the expected final state.
- [ ] Duplicate processing is prevented under retries.
- [ ] One order can be traced through all services.
- [ ] The workload produces repeatable results.
- [ ] Baseline tests pass after repeated resets.

---

## Phase 4 — Observability foundation

**Goal:** Make the incident solvable through operational evidence.

### Platform

- [ ] Add Prometheus.
- [ ] Add Loki.
- [ ] Add Grafana.
- [ ] Add OpenTelemetry Collector.
- [ ] Provision Grafana data sources automatically.
- [ ] Provision initial dashboards automatically.

### Application telemetry

- [ ] Emit request counts and latency.
- [ ] Emit processing success and failure counts.
- [ ] Emit retry and duplicate-prevention counts.
- [ ] Expose queue-related operational metrics.
- [ ] Propagate correlation IDs through messages.
- [ ] Include correlation IDs in logs.
- [ ] Define useful alerts that do not reveal root causes.

### Exit criteria

- [ ] Every expected diagnosis has observable evidence.
- [ ] Dashboards do not directly reveal the cause.
- [ ] A learner can reconstruct the incident timeline.
- [ ] A single order can be followed across services.

---

## Phase 5 — First incident: `inc-001`

**Goal:** Produce one realistic, deterministic, repairable incident.

### Learner-facing starting point

```text
Incident: INC-001

Customer report:
Some orders remain in Processing, while a small number appear twice.

Initial alert:
Order completion rate has fallen below its expected threshold.
```

### Tasks

- [ ] Define two or three interacting internal faults.
- [ ] Ensure fault names do not appear in learner-visible material.
- [ ] Create deterministic fault activation.
- [ ] Create deterministic incident traffic.
- [ ] Add realistic initial alerts.
- [ ] Add evidence for each cause in logs or metrics.
- [ ] Define at least one immediate mitigation.
- [ ] Define valid permanent-repair invariants.
- [ ] Add the learner brief.
- [ ] Add an evidence worksheet.
- [ ] Add a postmortem template.
- [ ] Add reset hooks.

### Proposed structure

```text
scenarios/inc-001/
├── manifest.yaml
├── brief.md
├── evidence.md
├── postmortem-template.md
├── seed/
├── fault-config/
└── expected-outcomes/
```

### Exit criteria

- [ ] An uninformed tester can reproduce the incident.
- [ ] The diagnosis is not disclosed by names or configuration comments.
- [ ] Each planted fault has sufficient evidence.
- [ ] A partial repair produces measurable partial improvement.
- [ ] A complete repair restores all required invariants.
- [ ] Reset restores the defined initial broken state while preserving archived learner work.

---

## Phase 6 — Behavioural assessment and rubric support

**Goal:** Verify system behaviour without requiring one exact implementation and support optional review of written reasoning.

### Grader

- [ ] Establish the Python grader package.
- [ ] Add pytest configuration.
- [ ] Add boto3 local endpoint configuration.
- [ ] Check order completion behaviour.
- [ ] Check that queue backlog drains.
- [ ] Check duplicate prevention.
- [ ] Check the expected failure-recovery path.
- [ ] Run a load-based regression check.
- [ ] Restart services and verify repair durability.
- [ ] Detect unsafe or superficial workarounds.
- [ ] Collect learner evidence and postmortem paths.
- [ ] Produce machine-readable JSON results.
- [ ] Produce a readable terminal behavioural report.

### Rubric support

- [ ] Validate required evidence-workbook structure.
- [ ] Validate required postmortem structure.
- [ ] Report the written rubric as `NOT REVIEWED` by default.
- [ ] Document self-review and peer-review use of the 100-point rubric.
- [ ] Keep any future AI-assisted review optional and non-authoritative.

### Exit criteria

- [ ] Multiple correct implementations can pass.
- [ ] Superficial workarounds fail.
- [ ] Automated behavioural results are deterministic across repeated runs.
- [ ] Normal grader output does not reveal the intended diagnosis or repair.
- [ ] Assessment never contacts real AWS.

---

## Phase 7 — Reusable scenario framework

**Goal:** Make subsequent incidents cheaper to author without over-generalizing early.

### Tasks

- [ ] Define the scenario manifest JSON Schema.
- [ ] Validate manifests before startup.
- [ ] Create scenario lifecycle hooks.
- [ ] Create the seed-data interface.
- [ ] Create the fault-injection interface.
- [ ] Create the grader plugin interface.
- [ ] Add scenario resource requirements.
- [ ] Add difficulty metadata.
- [ ] Isolate networks and volumes by scenario.
- [ ] Implement `make list`.
- [ ] Implement `make new-incident ID=inc-002`.
- [ ] Add a scenario-author template.

### Exit criteria

- [ ] A new scenario does not require platform-core changes.
- [ ] Invalid manifests fail before containers start.
- [ ] Scenarios cannot leak state into each other.
- [ ] Platform upgrades do not require duplicated scenario configuration.

---

## Phase 8 — Developer experience and public beta

**Goal:** Make OutageGym usable without assistance from its authors.

### Documentation

- [ ] Complete the README.
- [ ] Add architecture diagrams.
- [ ] Add installation instructions.
- [ ] Add macOS instructions.
- [ ] Add Linux instructions.
- [ ] Add WSL notes.
- [ ] Add troubleshooting documentation.
- [ ] Add learner instructions.
- [ ] Add scenario-authoring documentation.
- [ ] Add security guidance.

### Distribution

- [ ] Publish versioned application images to GHCR.
- [ ] Pin all released images.
- [ ] Add a GitHub release workflow.
- [ ] Add release notes template.
- [ ] Add automated clean-machine verification.

### Beta validation

- [ ] Test with at least three people from fresh clones.
- [ ] Verify at least one ARM64 machine.
- [ ] Verify at least one AMD64 machine.
- [ ] Confirm testers can start without manual repair.
- [ ] Confirm testers can reset reliably.
- [ ] Record confusing evidence and documentation gaps.
- [ ] Resolve all release-blocking feedback.

### Exit criteria

- [ ] A new user can complete setup without author assistance.
- [ ] The incident works across the documented environments.
- [ ] Resource usage is documented and acceptable.
- [ ] A tagged public beta release exists.

---

## Phase 9 — Incident catalogue

**Goal:** Expand only after the platform and first incident are stable.

- [ ] `inc-002` — missing notifications
- [ ] `inc-003` — intermittent checkout failures
- [ ] `inc-004` — delayed file processing
- [ ] `inc-005` — inconsistent payment status
- [ ] `inc-006` — authentication degradation

Potential technologies and failure domains:

- S3 notifications
- EventBridge routing
- Lambda retries and concurrency
- DynamoDB conditional writes
- IAM permissions
- Secrets rotation
- API Gateway configuration
- Step Functions compensation
- CloudWatch alarms

## Post-MVP backlog

- [ ] Kubernetes labs using kind or k3d
- [ ] Java 21 and Spring Boot incidents
- [ ] Kafka or MSK incidents
- [ ] RDS and connection-pool incidents
- [ ] Security incident scenarios
- [ ] Browser-based terminal
- [ ] OutageGym web interface
- [ ] Remote hidden grading
- [ ] Signed completion records
- [ ] Multiplayer or team incidents
- [ ] Random scenario selection
- [ ] Seeded scenario variations

## Major risks and mitigations

| Risk | Mitigation |
|---|---|
| Floci differs from AWS | Maintain a tested operation compatibility matrix and avoid unsupported fidelity claims |
| Scenario files reveal answers | Use opaque naming, prebuilt images where useful, and document the honour-system boundary |
| Local grader can be inspected | Optimize for learning first; consider an optional remote grader later |
| Docker resource usage is excessive | Start with a small vertical slice, add limits, and implement `make doctor` |
| Reset produces inconsistent state | Use scenario-scoped volumes, deterministic seeds, and reset tests in CI |
| Users accidentally target AWS | Require a localhost endpoint, fake credentials, and a hard startup guard |
| Too much framework work too early | Complete and test `inc-001` before extracting the scenario SDK |
| Dashboards spoil the diagnosis | Review every learner-visible label, query, and alert for spoilers |

## Definition of MVP done

- [ ] A fresh clone passes `make doctor` on a supported machine.
- [ ] `make start INCIDENT=inc-001` launches the complete system.
- [ ] The initial incident is reproducible.
- [ ] The learner can investigate using documented tools.
- [ ] At least two valid repair approaches are accepted.
- [ ] `make grade INCIDENT=inc-001` returns a deterministic behavioural result and written-rubric review status.
- [ ] `make reset INCIDENT=inc-001` restores the defined initial incident while preserving archived learner work.
- [ ] `make stop` cleans up safely.
- [ ] CI validates startup, behavioural assessment, reset, and cleanup.
- [ ] Three beta users complete the flow without author intervention.

## Current focus

**Active phase:** Phase 1 — Floci feasibility spike

**Next action:** Create and push the Phase 0 benchmark commit, then begin the Floci spike one file at a time.

## Open decisions

- [x] Use `OutageGym` as the final repository name.
- [ ] Select the repository license.
- [x] Use a continuously running worker for `inc-001`; test Lambda for later incidents.
- [x] Include source locally but require evidence-first diagnosis before source inspection under the MVP honour system.
- [x] Use deterministic postmortem structure checks in the MVP; keep qualitative or AI-assisted review optional and clearly labelled.
- [~] Use 4 GB available to Docker and 8 GB total system memory as initial targets; validate them during runtime and beta testing.
- [x] Treat ARM64 as a beta validation target; final support depends on the pinned image compatibility spike.

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-15 | Use opaque scenario IDs such as `inc-001` | Root-cause names would spoil diagnosis |
| 2026-10-15 | Use Docker Compose for the MVP | Lowest-friction local orchestration |
| 2026-10-15 | Use Floci as the AWS-compatible layer | Enables local AWS-oriented exercises without an AWS account |
| 2026-10-15 | Defer Kubernetes | Prove the core incident workflow before adding orchestration complexity |
| 2026-10-15 | Build one complete incident before a scenario SDK | Avoid premature abstraction |
| 2026-10-15 | Use a continuously running worker in `inc-001` | Reduce MVP dependence on Docker-socket-backed Lambda execution |
| 2026-10-15 | Containerize learner tooling beyond Docker, Make, Git, and curl | Preserve the one-command local experience |
| 2026-10-15 | Use an honour-system investigation boundary in the MVP | A fully local public repository cannot genuinely hide source and grader logic |

## Changelog

### 2026-10-15

- Created the initial phase-based implementation plan.
- Recorded MVP boundaries, technology direction, scenario naming policy, risks, and completion criteria.
- Drafted the Phase 0 product, authoring, scoring, architecture, learner-brief, and maintainer specifications.
- Started reviewing the Phase 0 documents before its benchmark commit.

### 2026-10-16

- Reviewed and refined every Phase 0 document.
- Defined deterministic behavioural assessment separately from optional written-rubric review.
- Clarified deterministic incident activation, safe mitigation ordering, and non-destructive reset requirements.
- Completed the Phase 0 exit criteria and prepared the benchmark commit.
