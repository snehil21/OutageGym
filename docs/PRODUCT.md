# OutageGym Product Specification

## Product promise

OutageGym provides production-like incidents that engineers can run, investigate, repair, behaviourally verify, and reset entirely on their own machines.

The product is not a tutorial that announces the failing component. It begins with the same information an on-call engineer would normally receive: an alert, a customer symptom, and access to operational tools. The learner must determine the impact, build and test hypotheses, mitigate the incident, implement a durable repair, and document what happened.

## Primary learner

The MVP is for backend engineers with approximately one to five years of experience who:

- Can use a terminal and read application logs.
- Understand HTTP APIs and asynchronous processing.
- Know basic Docker concepts.
- Have introductory AWS knowledge but may not have operated AWS incidents.
- Want evidence-based incident-response practice rather than guided copying.

The MVP is not intended for a learner who is completely new to programming, Docker, or HTTP services.

## Learning outcomes

After completing `inc-001`, a learner should be able to:

1. Separate customer symptoms from possible causes.
2. Quantify impact and blast radius before changing the system.
3. Correlate queue behaviour, application latency, retries, and duplicate side effects.
4. Use logs, metrics, and AWS-compatible CLI output as evidence.
5. Apply a reversible mitigation before attempting a permanent repair.
6. Verify recovery under repeatable load and after service restart.
7. Write a concise, blameless postmortem with prevention actions.

## Difficulty model

### Beginner

- One primary fault.
- One service path.
- Direct evidence in logs and one dashboard.
- Suggested investigation commands.
- No interacting failures.
- Expected completion time: 30–45 minutes.

### Intermediate

- Two or three interacting faults.
- Multiple services and asynchronous processing.
- Evidence must be correlated across logs, metrics, and resource configuration.
- No root-cause hints in the default learner material.
- More than one valid mitigation or repair.
- Expected completion time: 60–90 minutes.

### Advanced

- Four or more interacting faults or misleading symptoms.
- Partial failures, retry amplification, or recovery trade-offs.
- Incomplete or noisy telemetry that must be improved safely.
- Multiple plausible hypotheses.
- Expected completion time: 90–150 minutes.

`inc-001` is an intermediate incident.

## Learner journey

### 1. Prepare

The learner clones the repository and runs:

```bash
make doctor
make start INCIDENT=inc-001
```

`make doctor` verifies local prerequisites and rejects configuration that could contact real AWS. `make start` provisions a deterministic broken environment, starts repeatable traffic, and prints the incident brief and investigation URLs.

### 2. Detect

The learner receives only the initial alert and customer report. No failing service or AWS feature is named as the cause.

### 3. Triage

The learner records:

- Primary customer-visible symptom.
- Start time and current duration.
- Approximate affected percentage.
- Affected and unaffected paths.
- Immediate business risk.

### 4. Diagnose

The learner builds hypotheses and supports or rejects them using:

- Grafana dashboards.
- Prometheus metrics.
- Loki logs.
- AWS CLI commands pointed at Floci.
- Health endpoints.
- Terraform resource configuration.

During the observability-first stage, the learner agrees not to inspect application source, fault configuration, grader implementation, or maintainer documents.

### 5. Mitigate

The learner applies a reversible action that reduces current customer impact. The action must not destroy evidence, discard valid work, or disable behavioural checks and telemetry.

### 6. Repair

After recording an evidence-backed diagnosis, the learner may inspect and modify the designated application and infrastructure surfaces. A correct repair must restore behaviour without weakening safety invariants.

### 7. Verify

The learner verifies the repair under the supplied load, after service restart, and through black-box behavioural checks.

### 8. Postmortem

The learner completes the supplied template with impact, timeline, evidence, causes, mitigation, repair, and prevention actions.

### 9. Assess and reset

```bash
make grade INCIDENT=inc-001
make reset INCIDENT=inc-001
```

Assessment reports deterministic behavioural results and marks the written rubric as reviewed or not reviewed. Reset restores the defined initial broken state.

## Inspection and modification policy

### Always allowed to inspect

- Incident brief and learner workspace.
- Grafana, Prometheus, and Loki.
- AWS CLI requests sent to the documented local endpoint.
- Health endpoints and exposed application behaviour.
- Learner-visible Terraform and runtime configuration.
- Learner evidence and postmortem files.

### Allowed to modify after diagnosis is recorded

- Designated application source.
- Designated Terraform and runtime configuration.
- Scenario-approved service configuration.

### Outside the exercise boundary

- Grader source and expected outcomes.
- Fault-injection implementation.
- Maintainer solution documents.
- Platform telemetry configuration.
- Container internals not exposed by the exercise.
- Disabling traffic, metrics, logs, or grader services to force a passing state.

These boundaries are enforced by the honour system in the local MVP. Stronger isolation may be added through prebuilt images or a remote grader after the learning workflow is proven.

## MVP resource expectations

Initial learner host targets, to be validated during the runtime and beta phases:

- macOS or Linux; WSL2 may work but is not part of the first validation target.
- Git.
- Docker Engine or Docker Desktop with Docker Compose.
- GNU Make or a compatible `make` implementation.
- `curl` for diagnostics.
- At least 4 logical CPU cores.
- At least 8 GB total system memory, with 4 GB available to Docker.
- At least 6 GB free disk space before image download.

Terraform, Node.js, Python, AWS CLI, and assessment dependencies should run in version-pinned containers for learners. Contributors may install them locally for faster development.

## MVP success criteria

The MVP is successful when:

- A supported fresh machine can start `inc-001` from a clone with one primary command.
- The incident produces consistent symptoms and evidence.
- A learner can reach the diagnosis without reading source code.
- At least two safe repair approaches can satisfy the behavioural checks.
- Reset restores the original incident every time.
- Three beta learners complete the flow without author intervention.
