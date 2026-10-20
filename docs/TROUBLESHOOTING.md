# Troubleshooting

Run commands from the repository root and use the same incident ID throughout.

## Prerequisites

```bash
make doctor INCIDENT=inc-001
```

- If Docker is missing, follow [Getting started](GETTING_STARTED.md).
- If the daemon is unavailable, start Docker Desktop or the Linux Docker service.
- If Compose is unavailable, verify `docker compose version`.
- If the manifest is invalid, run `make validate-scenarios` and fix the reported field.

The older `docker-compose` command is not supported.

## Port conflicts

Copy `.env.example` to `.env` and change the conflicting host port. For example:

```dotenv
GRAFANA_HOST_PORT=13002
ORDER_API_HOST_PORT=13000
```

Internal container ports must remain unchanged.

## Runtime problems

```bash
make status INCIDENT=inc-001
docker compose -p outagegym-inc-001 -f compose.yaml logs --tail 100 <service>
```

Replace `<service>` with `order-api`, `order-worker`, `grafana`, or another
service shown by `make status`. Correct the reported problem and rerun
`make start`.

Check API readiness with your configured host port:

```bash
curl --fail http://127.0.0.1:3000/ready
```

## Restore the baseline

```bash
make reset INCIDENT=inc-001
```

Reset archives learner files but deletes runtime evidence and data. Preserve
anything important first.

## Bug reports

Include the operating system and CPU architecture, Docker and Compose versions,
incident ID, failed command, `make status` output, and relevant sanitized logs.
