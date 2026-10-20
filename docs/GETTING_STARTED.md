# Getting Started

OutageGym runs its application and tools in containers. On the host you need:

- Git, Docker with Compose v2, Make, and `curl`.
- macOS, Linux, or Windows with WSL 2.
- An initial target of 4 CPU cores, 8 GB system memory, 4 GB available to
  Docker, and 6 GB free disk space.

Beta testing will confirm the resource target and WSL, ARM64, and AMD64 support.

## Platform setup

- **macOS:** Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/).
  Run `xcode-select --install` if Git or Make is missing.
- **Linux:** Follow the [Docker Engine instructions](https://docs.docker.com/engine/install/),
  install the [Compose plugin](https://docs.docker.com/compose/install/), and
  configure your account to access Docker without `sudo`.
- **WSL 2:** Follow the [Docker Desktop WSL guide](https://docs.docker.com/desktop/features/wsl/),
  enable integration for your Linux distribution, and clone the repository in
  its Linux filesystem rather than under `/mnt/c`. Native Windows shells are not
  supported.

Verify the prerequisites:

```bash
git --version
docker version
docker compose version
make --version
curl --version
```

## Run an incident

```bash
git clone https://github.com/snehil21/OutageGym.git
cd OutageGym
make doctor
make list
make start INCIDENT=inc-001
make workload INCIDENT=inc-001
```

Read `scenarios/inc-001/brief.md`, then investigate in Grafana at
<http://127.0.0.1:3002>. Record hypotheses and evidence before changing the
system. Preserve useful timestamps, order IDs, message IDs, and correlation IDs.

Apply a reversible mitigation when impact is ongoing, then implement and verify
a permanent repair:

```bash
make workload INCIDENT=inc-001
make grade INCIDENT=inc-001
```

An initial grading failure is expected. The grader checks behaviour and restart
durability, not one prescribed source-code diff. Written work remains
`NOT REVIEWED` until a person reviews it.

Complete the scenario's postmortem, then stop or reset the lab:

```bash
make stop INCIDENT=inc-001
# Or archive learner work and restore the broken baseline:
make reset INCIDENT=inc-001
```

## Rules of engagement

- Follow the brief's honour-system investigation boundary.
- Prefer operational evidence before implementation details.
- Do not modify the grader, expected outcomes, logs, or metrics to force a pass.
- Never use real AWS credentials, endpoints, or production data.
- Preserve evidence before restarting or resetting services.

## Port conflicts

Copy `.env.example` to `.env` and change the conflicting host port. Internal
container ports do not change.
