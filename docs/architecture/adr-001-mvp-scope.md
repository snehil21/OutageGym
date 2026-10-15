# ADR-001: MVP Scope and Runtime

- Status: Accepted
- Date: 2026-10-15

## Context

OutageGym needs to prove that a local incident can be started, investigated, repaired, behaviourally verified, and reset before investing in a general framework, Kubernetes, or a hosted product.

The first scenario must exercise AWS-oriented operational reasoning while remaining inexpensive, reproducible, and safe to run without an AWS account.

## Decision

The MVP will provide one intermediate incident, `inc-001`, built around an order-processing API, SQS, a continuously running TypeScript worker, and DynamoDB.

The runtime will use:

- Docker Compose for local orchestration.
- A pinned Floci image for AWS-compatible APIs.
- Terraform executed from a pinned container for provisioning.
- Node.js 22 and TypeScript for application services.
- Prometheus, Loki, Grafana, and OpenTelemetry for investigation.
- k6 for deterministic traffic.
- Python, pytest, and boto3 in a container for behavioural assessment.

The worker will be continuously running rather than Lambda-based in the first incident. This reduces dependency on Docker-socket-backed execution and narrows the initial Floci compatibility surface. Lambda compatibility is deferred until after `inc-001` and may be evaluated for later incidents.

Learners need only Git, Docker with Docker Compose, Make, curl, and adequate local resources. Terraform, AWS CLI, Node.js, Python, and grader dependencies should be containerized.

## Consequences

### Expected benefits

- One primary start command is achievable.
- No AWS account or real credentials are needed.
- The first incident can focus on SQS semantics, idempotency, backlog, and evidence correlation.
- The runtime is designed for portability across supported macOS and Linux hosts.
- Application and assessment dependencies can be version pinned.

### Known trade-offs

- Floci does not reproduce every production AWS behaviour.
- A public local repository cannot genuinely hide source, faults, or grader logic.
- Docker Compose does not teach Kubernetes operations.
- A continuously running worker does not reproduce Lambda concurrency and event-source mapping exactly.

## Explicitly deferred

- Kubernetes and EKS.
- Lambda-dependent incident design.
- Web UI and browser terminal.
- Accounts, payments, hosted sessions, and remote grading.
- Recruiter-visible verification.
- Multiple scenarios before `inc-001` is stable.

## Revisit conditions

Revisit this decision when:

- A later compatibility spike proves Lambda execution and event-source behaviour reliable enough for a future incident.
- The first complete incident passes repeatability and beta criteria.
- Docker Compose becomes an obstacle to a specific learning objective.
