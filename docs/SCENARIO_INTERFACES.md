# Scenario Extension Interfaces

Scenario-specific behaviour belongs under `scenarios/<incident-id>/hooks/` so a new incident does not require platform-core changes. Every hook is optional and must be an executable POSIX shell script named `<hook>.sh`.

The platform exports these variables to every hook:

| Variable                    | Meaning                                |
| --------------------------- | -------------------------------------- |
| `INCIDENT_ID`               | Selected opaque scenario ID            |
| `OUTAGEGYM_HOOK`            | Hook currently being executed          |
| `OUTAGEGYM_SCENARIO_DIR`    | Absolute path to the selected scenario |
| `OUTAGEGYM_REPOSITORY_ROOT` | Absolute repository path               |
| `OUTAGEGYM_COMPOSE_PROJECT` | Scenario-scoped Compose project name   |

Hooks must return `0` on success and a non-zero status on failure. A failure stops the lifecycle command. Hooks must be deterministic, operate only on scenario-owned resources, and must not contact real AWS endpoints.

## Lifecycle hooks

| Hook           | Execution point                                             |
| -------------- | ----------------------------------------------------------- |
| `before-start` | Before infrastructure or application startup                |
| `seed`         | After Terraform provisioning and before application startup |
| `inject-fault` | After seed data and before application startup              |
| `after-start`  | After every service reports ready                           |
| `before-reset` | Before learner files and runtime state are reset            |
| `after-reset`  | After the recreated scenario reports ready                  |
| `before-stop`  | Before scenario containers and networks are removed         |
| `after-stop`   | After scenario runtime cleanup                              |

## Seed-data interface

`seed.sh` creates only deterministic scenario-owned data. It must be safe to execute again after a clean reset. Static seed inputs should live under `scenarios/<incident-id>/seed/`.

## Fault-injection interface

`inject-fault.sh` activates deterministic scenario faults after infrastructure exists. Learner-facing names and output must not reveal the diagnosis. Declarative runtime settings may remain in `fault-config/runtime.env`.

## Grader plugin interface

If `grade.sh` exists, `make grade INCIDENT=<incident-id>` executes it instead of the default behavioural grader. The platform starts the application services first. The plugin must return `0` only when the scenario's behavioural requirements pass and must not require real cloud credentials.
