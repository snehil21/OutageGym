# OutageGym Implementation Plan

> A living implementation plan for a local, reproducible incident-response practice platform.
>
> Last updated: 2026-10-19

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

- [x] One complete AWS-oriented incident: `inc-001`
- [x] Docker Compose orchestration
- [x] Floci for local AWS-compatible services
- [x] Terraform for infrastructure provisioning
- [x] TypeScript application services
- [x] Metrics and centralized logs
- [x] Repeatable load generation
- [x] Automated behavioural assessment
- [x] Postmortem submission and rubric
- [x] Makefile-based lifecycle commands
- [x] Local-only execution
- [x] macOS and Linux support
- [x] CI smoke testing

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

- [x] Define the primary learner persona. See `README.md`.
- [x] Define beginner, intermediate, and advanced difficulty characteristics. See `docs/INCIDENT_AUTHORING.md`.
- [x] Define what learners may inspect during each stage. See `docs/GETTING_STARTED.md`.
- [x] Define what learners may modify. See `docs/GETTING_STARTED.md`.
- [x] Define the incident lifecycle:
  - [x] Detect
  - [x] Triage
  - [x] Diagnose
  - [x] Mitigate
  - [x] Repair
  - [x] Verify
  - [x] Write postmortem
- [x] Finalize the common 100-point review rubric. See `docs/INCIDENT_AUTHORING.md`.
- [x] Write the learner-visible `inc-001` brief using symptoms only. See `scenarios/inc-001/brief.md`.
- [x] Document the internal causes and expected evidence separately. See `scenarios/inc-001/maintainer.md`.
- [x] Document initial CPU, memory, disk, Docker, and Terraform targets that require later validation. See `docs/GETTING_STARTED.md`.
- [x] Decide how the honour-system source and assessment boundaries work. See `docs/ARCHITECTURE.md`.

### Deliverables

- [x] Product scope in `README.md` and `docs/GETTING_STARTED.md`
- [x] `docs/INCIDENT_AUTHORING.md`
- [x] Architecture and key decisions in `docs/ARCHITECTURE.md`
- [x] Internal design for `inc-001`: `scenarios/inc-001/maintainer.md`
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

- [x] Start a pinned Floci image through Docker Compose.
- [x] Configure AWS CLI against the local Floci endpoint.
- [x] Configure the JavaScript AWS SDK against Floci.
- [x] Configure boto3 against Floci.
- [x] Configure Terraform against Floci.
- [x] Create and use an SQS standard queue.
- [x] Verify SQS visibility timeout behaviour.
- [-] Dead-letter queue and redrive behaviour — deferred to a later incident.
- [-] Lambda invocation — deferred because `inc-001` uses a continuously running worker.
- [x] Create a DynamoDB table.
- [x] Verify DynamoDB conditional writes.
- [-] CloudWatch logs — deferred because `inc-001` uses Loki.
- [-] CloudWatch metrics and alarms — deferred because `inc-001` uses Prometheus.
- [x] Verify in-memory lifecycle and clean reset behaviour.
- [x] Determine which selected features require Docker socket access; none do.
- [x] Test the spike on ARM64.
- [-] Test on AMD64 — deferred to later CI and platform-hardening work.

### Safety checks

- [x] Use obviously fake AWS credentials.
- [x] Add a JavaScript SDK guard that rejects non-local AWS endpoints and credentials.
- [-] Add and verify network-level egress isolation — deferred until runtime dependencies are packaged without startup registry access.
- [x] Bind Floci to localhost only.
- [x] Document that the selected features require no Docker socket access.

### Deliverables

- [x] `spikes/floci-compatibility/compose.yaml`
- [x] `spikes/floci-compatibility/terraform/`
- [x] `spikes/floci-compatibility/sdk-js/check.mjs`
- [-] Automated cross-platform compatibility suite — deferred to later CI work.
- [x] Floci compatibility matrix
- [x] Recorded go/no-go decision

### Exit criteria

- [x] Every operation needed by `inc-001` works predictably.
- [x] Startup and reset succeed predictably in the tested lifecycle.
- [x] No real AWS account is required.
- [x] No required `inc-001` behaviour is unsupported; later-incident services are explicitly deferred.

---

## Phase 2 — Repository and runtime foundation

**Goal:** Establish a safe and repeatable local runtime.

### Repository foundation

- [x] Initialize the Git repository.
- [x] Configure the GitHub `origin` remote.
- [x] Add license.
- [x] Add `.gitignore` and `.dockerignore` files.
- [x] Add initial README.
- [x] Establish formatting and linting conventions.
- [x] Add contribution guidelines.

### Runtime

- [x] Create the base `compose.yaml`.
- [x] Define isolated Docker networks.
- [x] Add the pinned Floci service.
- [x] Add container health checks.
- [-] Add named and scenario-scoped volumes — deferred until the baseline introduces persistent services.
- [-] Add CPU and memory limits where portable — deferred until the complete MVP service set can be profiled.
- [x] Bind public ports to `127.0.0.1`.
- [-] Add generated local environment configuration — deferred until scenarios require generated values.
- [x] Add deterministic teardown and volume cleanup.

### Commands

- [x] Implement `make doctor`.
- [x] Implement `make start`.
- [x] Implement `make status`.
- [x] Implement `make stop`.
- [x] Implement `make reset`.
- [x] Make commands fail with actionable error messages.

### CI

- [x] Add GitHub Actions workflow.
- [x] Validate Docker Compose configuration.
- [-] Validate Terraform formatting and configuration — deferred until production Terraform configuration exists.
- [x] Run a headless startup smoke test.
- [x] Verify cleanup after CI execution.

### Exit criteria

- [x] A fresh clone starts with one documented command.
- [x] Reset produces identical infrastructure and data.
- [x] Stop leaves no unexpected running resources.
- [x] CI passes without real AWS credentials.

---

## Phase 3 — Healthy application baseline

**Goal:** Build and verify a correct order-processing system before injecting faults.

### Proposed baseline

```text
Client -> Order API -> SQS order queue -> Order worker -> DynamoDB
```

### Tasks

- [x] Build the TypeScript Order API.
- [x] Build the TypeScript Order Worker.
- [x] Implement AWS SDK endpoint configuration.
- [x] Implement SQS publishing and consumption.
- [x] Implement DynamoDB order persistence.
- [x] Implement idempotent order processing.
- [x] Add correlation IDs.
- [x] Add structured JSON logs.
- [x] Add health and readiness endpoints.
- [x] Add graceful shutdown.
- [x] Build reproducible local Docker images from pinned base images.
- [x] Add deterministic seed data.
- [x] Add a k6 baseline workload.
- [x] Add end-to-end happy-path tests.

### Exit criteria

- [x] Orders consistently reach the expected final state.
- [x] Duplicate processing is prevented under retries.
- [x] One order can be traced through all services.
- [x] The workload produces repeatable results.
- [x] Baseline tests pass after repeated resets.

---

## Phase 4 — Observability foundation

**Goal:** Make the incident solvable through operational evidence.

### Platform

- [x] Add Prometheus.
- [x] Add Loki.
- [x] Add Grafana.
- [x] Add OpenTelemetry Collector.
- [x] Provision Grafana data sources automatically.
- [x] Provision initial dashboards automatically.

### Application telemetry

- [x] Emit request counts and latency.
- [x] Emit processing success and failure counts.
- [x] Emit retry and duplicate-prevention counts.
- [x] Expose queue-related operational metrics.
- [x] Propagate correlation IDs through messages.
- [x] Include correlation IDs in logs.
- [x] Define useful alerts that do not reveal root causes.

### Exit criteria

- [x] Every expected diagnosis has observable evidence.
- [x] Dashboards do not directly reveal the cause.
- [x] A learner can reconstruct the incident timeline.
- [x] A single order can be followed across services.

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

- [x] Define two or three interacting internal faults.
- [x] Ensure fault names do not appear in learner-visible material.
- [x] Create deterministic fault activation.
- [x] Create deterministic incident traffic.
- [x] Add realistic initial alerts.
- [x] Add evidence for each cause in logs or metrics.
- [x] Define at least one immediate mitigation.
- [x] Define valid permanent-repair invariants.
- [x] Add the learner brief.
- [x] Add an evidence worksheet.
- [x] Add a postmortem template.
- [x] Add reset hooks.

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

- [x] An uninformed tester can reproduce the incident.
- [x] The diagnosis is not disclosed by names or configuration comments.
- [x] Each planted fault has sufficient evidence.
- [x] A partial repair produces measurable partial improvement.
- [x] A complete repair restores all required invariants.
- [x] Reset restores the defined initial broken state while preserving archived learner work.

---

## Phase 6 — Behavioural assessment and rubric support

**Goal:** Verify system behaviour without requiring one exact implementation and support optional review of written reasoning.

### Grader

- [x] Establish the Python grader package.
- [x] Add pytest configuration.
- [x] Add boto3 local endpoint configuration.
- [x] Check order completion behaviour.
- [x] Check that queue backlog drains.
- [x] Check duplicate prevention.
- [x] Check the expected failure-recovery path.
- [x] Run a load-based regression check.
- [x] Restart services and verify repair durability.
- [x] Detect unsafe or superficial workarounds.
- [x] Collect learner evidence and postmortem paths.
- [x] Produce machine-readable JSON results.
- [x] Produce a readable terminal behavioural report.

### Rubric support

- [x] Validate required evidence-workbook structure.
- [x] Validate required postmortem structure.
- [x] Report the written rubric as `NOT REVIEWED` by default.
- [x] Document self-review and peer-review use of the 100-point rubric.
- [x] Keep any future AI-assisted review optional and non-authoritative.

### Exit criteria

- [x] Multiple correct implementations can pass.
- [x] Superficial workarounds fail.
- [x] Automated behavioural results are deterministic across repeated runs.
- [x] Normal grader output does not reveal the intended diagnosis or repair.
- [x] Assessment never contacts real AWS.

---

## Phase 7 — Reusable scenario framework

**Goal:** Make subsequent incidents cheaper to author without over-generalizing early.

### Tasks

- [x] Define the scenario manifest JSON Schema.
- [x] Validate manifests before startup.
- [x] Create scenario lifecycle hooks.
- [x] Create the seed-data interface.
- [x] Create the fault-injection interface.
- [x] Create the grader plugin interface.
- [x] Add scenario resource requirements.
- [x] Add difficulty metadata.
- [x] Isolate networks and volumes by scenario.
- [x] Implement `make list`.
- [x] Implement `make new-incident ID=inc-002`.
- [x] Add a scenario-author template.

### Exit criteria

- [x] A new scenario does not require platform-core changes.
- [x] Invalid manifests fail before containers start.
- [x] Scenarios cannot leak state into each other.
- [x] Platform upgrades do not require duplicated scenario configuration.

---

## Phase 8 — Developer experience and public beta

**Goal:** Make OutageGym usable without assistance from its authors.

### Documentation

- [x] Complete the README.
- [x] Add architecture diagrams.
- [x] Add installation instructions.
- [x] Add macOS instructions.
- [x] Add Linux instructions.
- [x] Add WSL notes.
- [x] Add troubleshooting documentation.
- [x] Add learner instructions.
- [x] Add scenario-authoring documentation.
- [x] Add security guidance.

### Distribution

- [ ] Publish versioned application images to GHCR.
- [ ] Pin all released images.
- [x] Add a GitHub release workflow.
- [x] Add release notes template.
- [x] Add automated clean-machine verification.

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

- [x] `inc-002` — missing notifications
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
- [x] `make start INCIDENT=inc-001` launches the complete system.
- [x] The initial incident is reproducible.
- [x] The learner can investigate using documented tools.
- [ ] At least two valid repair approaches are accepted.
- [x] `make grade INCIDENT=inc-001` returns a deterministic behavioural result and written-rubric review status.
- [x] `make reset INCIDENT=inc-001` restores the defined initial incident while preserving archived learner work.
- [x] `make stop` cleans up safely.
- [x] CI validates startup, behavioural assessment, reset, and cleanup.
- [ ] Three beta users complete the flow without author intervention.

## Current focus

**Active phase:** Phase 8 foundation ready; beta validation deferred

**Next action:** Merge the developer-experience and release foundation, expand the catalogue to five scenarios, then complete native-platform and external beta validation before tagging the public beta.

## Open decisions

- [x] Use `OutageGym` as the final repository name.
- [x] Use the Apache License 2.0 for the repository.
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
| 2026-10-16 | Proceed with Floci `2.3.0` for `inc-001` | Required SQS, DynamoDB, SDK, Terraform, and reset behaviour passed the compatibility spike |
| 2026-10-16 | Defer AMD64 and network-level egress validation | These are later CI and packaging concerns and should not delay the first product vertical slice |
| 2026-10-16 | Use the Apache License 2.0 | Preserve broad reuse while retaining notice and patent protections |
| 2026-10-16 | Scope Compose resources by incident | Keep container, network, and future volume names deterministic and isolated |

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
- Completed the Floci feasibility spike on ARM64 and recorded a conditional go decision.
- Deferred AMD64 validation, network-level isolation, and automated cross-platform compatibility checks to later CI and packaging work.
- Added the repository foundation, pinned Floci runtime, incident-scoped lifecycle commands, and concise local workflow documentation.
- Added CI validation for Compose configuration, headless startup, Floci health, teardown, and cleanup.
- Verified that reset removes temporary SQS state and recreates a healthy runtime.

### 2026-10-18

- Built the healthy Order API, SQS worker, and DynamoDB persistence baseline.
- Added incident-scoped resource naming, idempotent processing, correlation IDs, structured logs, readiness checks, and graceful shutdown.
- Added deterministic k6 traffic and end-to-end happy-path and duplicate-delivery tests.
- Verified the complete baseline in CI before and after two consecutive resets.

### 2026-10-19

- Added Prometheus, Loki, Grafana, and the OpenTelemetry Collector with pinned images and automatic provisioning.
- Instrumented the Order API and worker with request, processing, retry, duplicate-prevention, failure, and queue metrics.
- Added correlation-searchable application logs, a non-spoiler order-processing dashboard, and symptom-based alerts.
- Added repeatable verification for dashboards, alert health, metrics, and cross-service correlation.
- Added deterministic interacting queue-timing, idempotency, and capacity faults for `inc-001`.
- Added repeatable incident traffic plus broken-state, mitigation, complete-repair, and restart verification.
- Added reset-time learner-work archiving and restoration of the immutable incident baseline.

### 2026-10-20

- Added a local behavioural grader for completion, recovery, duplicate prevention, restart durability, and runtime safety.
- Added neutral terminal and machine-readable JSON reports without revealing the intended diagnosis or repair.
- Added deterministic written-artifact structure checks with a human-owned 100-point rubric and `NOT REVIEWED` default status.
- Added repeated healthy assessment runs to CI while preserving the intentionally broken default incident.
- Added schema-validated scenario manifests, lifecycle extension hooks, resource metadata, and incident-scoped persistent storage.
- Added reusable seed, fault-injection, and grader interfaces plus scenario authoring and listing commands.
- Added CI coverage for manifest validation, scenario generation, hook contracts, and cross-scenario isolation.
