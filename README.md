# OutageGym

**Production incidents you can diagnose and repair locally.**

OutageGym is a hands-on incident-response practice platform for backend
engineers. It starts a deliberately unhealthy system, gives you realistic
operational evidence, and grades the repaired behaviour without prescribing one
implementation.

It is intended for backend engineers who already understand terminals, HTTP,
Docker, and asynchronous processing. The first incident is intermediate and
requires correlating evidence across multiple services.

> The first three incidents are usable. Cross-platform beta validation is still
> in progress.

## Quick start

```bash
git clone https://github.com/snehil21/OutageGym.git
cd OutageGym
make doctor
make list
make start INCIDENT=inc-001
```

Open Grafana at <http://127.0.0.1:3002>, then read the selected scenario's
learner brief—for example, the [inc-001 brief](scenarios/inc-001/brief.md)—and
investigate the system. The default incident is intentionally broken, so an
initial grading failure is expected.

```bash
make workload INCIDENT=inc-001
make status INCIDENT=inc-001
make grade INCIDENT=inc-001
```

After repairing the incident, rerun `make grade`. When finished, stop the
runtime or reset it to the original broken state:

```bash
make stop INCIDENT=inc-001
# Or restore and restart the incident:
make reset INCIDENT=inc-001
```

`make reset` archives learner changes under
`.outagegym/archives/<incident>/` before restoring the baseline.

## Local endpoints

| Service            | Default address         |
| ------------------ | ----------------------- |
| Order API          | <http://127.0.0.1:3000> |
| Grafana            | <http://127.0.0.1:3002> |
| Prometheus         | <http://127.0.0.1:9090> |
| Loki API           | <http://127.0.0.1:3100> |
| Floci AWS emulator | <http://127.0.0.1:4566> |

To change host-facing addresses, copy `.env.example` to `.env` and edit the
values. Container-to-container endpoints remain internal to Docker Compose.

## Requirements

- macOS, Linux, or WSL 2; beta validation is still in progress.
- Git, Docker with Compose v2, Make, and `curl`.
- 4 CPU cores, 8 GB system memory, and 6 GB free disk space as the initial target.

See [Getting started](docs/GETTING_STARTED.md) for setup and the learner
workflow, and [Architecture](docs/ARCHITECTURE.md) for the system design.

## Scenario authors

```bash
make new-incident ID=inc-002
make validate-scenarios
```

See the [incident authoring guide](docs/INCIDENT_AUTHORING.md) and
[scenario interfaces](docs/SCENARIO_INTERFACES.md).

## Project status

The initial three-incident catalogue is complete. `inc-001`, `inc-002` and
`inc-003` are available. See the [changelog](CHANGELOG.md) for completed
milestones.

## Documentation

- [Getting started](docs/GETTING_STARTED.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Incident authoring guide](docs/INCIDENT_AUTHORING.md)
- [Changelog](CHANGELOG.md)
- [Floci compatibility results](spikes/floci-compatibility/COMPATIBILITY.md)

## License

OutageGym is licensed under the [Apache License 2.0](LICENSE).
