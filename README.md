# OutageGym

**Production incidents you can diagnose and repair locally.**

OutageGym starts a deliberately unhealthy distributed system, provides realistic
operational evidence, and grades the repaired behaviour without prescribing one
implementation. Everything runs locally with synthetic data and fake AWS
credentials.

The first three incidents are usable. Cross-platform beta validation is still
in progress.

## How AWS runs locally

OutageGym does not connect to an AWS account. [Floci](https://floci.io/) runs
inside Docker and emulates the AWS APIs used by the incidents. Terraform, the
AWS CLI, and both application services target `http://floci:4566` with fixed
fake credentials, so queues and tables are created only inside the local lab.

Use the Floci UI at <http://127.0.0.1:4500> to browse those emulated SQS and
DynamoDB resources. The UI is a separate, unprivileged Compose service; it does
not require access to the host Docker socket.

## Requirements

- macOS, Linux, or WSL 2.
- Git, Docker with Compose v2, Make, and `curl`.
- 4 CPU cores, 8 GB system memory, and 6 GB free disk space are recommended.

## Run an incident

```bash
git clone https://github.com/snehil21/OutageGym.git
cd OutageGym
make doctor
make list
make start INCIDENT=inc-001
make workload INCIDENT=inc-001
```

Use the same incident ID for every command.

## Learner workflow

### 1. Read the brief

Start with `scenarios/<incident-id>/brief.md`. It contains the customer-visible
symptom, available investigation surfaces, objectives, and safety constraints.

During the initial investigation, do **not** inspect:

- application source code;
- `fault-config/runtime.env`;
- `maintainer.md`;
- grader or incident-test implementation.

These files reveal implementation details or the intended diagnosis. Use
operational evidence first.

### 2. Investigate the running system

Open Grafana at <http://127.0.0.1:3002> and select the dashboard for the active
path:

- **Order Processing Overview** for order acceptance and processing.
- **Notification Delivery Overview** for INC-002 notification routing and
  delivery.

Open the Floci UI at <http://127.0.0.1:4500> to inspect the local AWS resources,
including queues, messages, tables, and records. Start diagnosis in Grafana,
then use Floci to confirm the underlying resource state.

For logs, select **Explore → Loki → Code**. Useful LogQL queries include:

```logql
{service_namespace="outagegym"}
```

```logql
{service_name="order-worker"} | event="order_processed"
```

Follow one request by replacing the example value:

```logql
{service_namespace="outagegym"} | correlationId="CORRELATION_ID"
```

Prometheus metrics and alerts are available at <http://127.0.0.1:9090>.
Container state and raw logs are available from the terminal:

```bash
make status INCIDENT=inc-001
docker compose -p outagegym-inc-001 -f compose.yaml \
  logs --follow order-api order-worker
```

Preserve relevant timestamps, order IDs, message IDs, correlation IDs, queries,
and observations before changing the system.

### 3. Record evidence

Fill in the existing worksheet at `scenarios/<incident-id>/evidence.md`. Record
at least two hypotheses, evidence that supports or rejects them, customer
impact, the diagnosis, and before-and-after mitigation evidence.

Do not create a separate evidence file—the scenario worksheet is part of the
assessment.

### 4. Mitigate and repair

After recording an evidence-backed diagnosis, you may inspect and modify
learner-visible application code, Terraform, Compose, and runtime configuration,
including `scenarios/<incident-id>/fault-config/runtime.env`.

Do not modify graders, tests, telemetry, or expected outcomes to force a pass.
Apply a reversible mitigation first when impact is ongoing, then implement the
permanent repair.

When configuration changes require recreating the runtime:

```bash
make stop INCIDENT=inc-001
make start INCIDENT=inc-001
```

Do not run `make reset` while developing a repair. Reset archives learner work
under `.outagegym/archives/<incident-id>/` and restores the original broken
baseline.

### 5. Verify the repair

```bash
make workload INCIDENT=inc-001
make grade INCIDENT=inc-001
```

The automated grader checks runtime safety, order completion, load recovery,
processing integrity, restart durability, and required written structure. It
grades observable behaviour rather than one prescribed code change. An initial
failure is expected; rerun it after the repair.

Written reasoning remains `NOT REVIEWED` until a person reviews it using this
rubric:

| Area                            | Points |
| ------------------------------- | -----: |
| Triage and customer impact      |     20 |
| Diagnosis supported by evidence |     25 |
| Immediate mitigation            |     20 |
| Permanent repair                |     20 |
| Postmortem                      |     15 |

Complete `scenarios/<incident-id>/postmortem-template.md`, then stop the lab:

```bash
make stop INCIDENT=inc-001
```

To archive learner changes and restore the original incident:

```bash
make reset INCIDENT=inc-001
```

## Local endpoints

| Service      | Default address                       |
| ------------ | ------------------------------------- |
| Order API    | <http://127.0.0.1:3000>               |
| Floci UI     | <http://127.0.0.1:4500>               |
| Grafana      | <http://127.0.0.1:3002>               |
| Prometheus   | <http://127.0.0.1:9090>               |
| Loki API     | <http://127.0.0.1:3100>               |
| Floci health | <http://127.0.0.1:4566/_floci/health> |

For host-port conflicts, copy `.env.example` to `.env` and change only the host
port values. Container-to-container addresses remain unchanged.

## Scenario authors

Create and validate a scenario:

```bash
make new-incident ID=inc-004
make validate-scenarios
```

Each `scenarios/<incident-id>/` directory contains a manifest, learner brief,
evidence worksheet, postmortem template, deterministic seed data, runtime fault
configuration, maintainer notes, and optional executable POSIX shell hooks.

Available hooks are `before-start`, `seed`, `inject-fault`, `after-start`,
`before-reset`, `after-reset`, `before-stop`, `after-stop`, and `grade`. Hooks
receive `INCIDENT_ID`, `OUTAGEGYM_HOOK`, `OUTAGEGYM_SCENARIO_DIR`,
`OUTAGEGYM_REPOSITORY_ROOT`, and `OUTAGEGYM_COMPOSE_PROJECT`.

Incidents must begin with symptoms rather than diagnosis, expose every required
conclusion through operational evidence, separate mitigation from repair, use
deterministic data and timing, grade observable outcomes, and remain restricted
to local endpoints and scenario-owned resources.

Before publishing, verify the workload, grader, reset, repeated execution, and
scenario isolation.

## Project information

- [Architecture](docs/ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)
- [Floci compatibility results](spikes/floci-compatibility/COMPATIBILITY.md)

The catalogue currently contains `inc-001`, `inc-002`, and `inc-003`.

## License

OutageGym is licensed under the [Apache License 2.0](LICENSE).
