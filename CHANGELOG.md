# Changelog

Notable changes to OutageGym are recorded here.

## Unreleased

- Added INC-004 poison-message diagnosis, bounded SQS redrive, inspectable
  dead-letter evidence, and restart-durable behavioural grading.
- Added an INC-003 checkout reliability dashboard and regression coverage for
  every provisioned Grafana dashboard.
- Stabilized INC-003 alert verification by allowing Prometheus to complete its
  configured evaluation period.
- Added shared service configuration, structured logging, telemetry, formatting,
  and workspace validation foundations.
- Added three deterministic incidents covering order-processing failures,
  missing notifications, and intermittent checkout failures.
- Added behavioural grading, restart-durability checks, learner-work archiving,
  and deterministic reset support.
- Added Prometheus, Loki, Grafana, and OpenTelemetry-based operational evidence.
- Added schema-validated scenario packs, lifecycle hooks, authoring tools, and
  incident-scoped infrastructure.
- Added pinned local containers, CI verification, release automation, and
  multi-architecture image build checks.
