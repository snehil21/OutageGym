INCIDENT ?= inc-001
COMPOSE_PROJECT := outagegym-$(INCIDENT)
SCENARIO_ENV := $(wildcard scenarios/$(INCIDENT)/fault-config/runtime.env)
COMPOSE_ENV := $(if $(SCENARIO_ENV),--env-file "$(SCENARIO_ENV)")
COMPOSE := INCIDENT_ID="$(INCIDENT)" docker compose $(COMPOSE_ENV) -p "$(COMPOSE_PROJECT)" -f compose.yaml
WORKLOAD_FILE := $(if $(wildcard workloads/k6/$(INCIDENT).js),$(INCIDENT).js,happy-path.js)
HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)
TERRAFORM := $(COMPOSE) --profile tools run --rm --user "$(HOST_UID):$(HOST_GID)" -e HOME=/tmp terraform
LEARNER_WORKSPACE := ./scripts/learner-workspace.sh

.PHONY: doctor start status stop reset workload test-e2e test-observability test-incident

doctor:
	@command -v docker >/dev/null 2>&1 || { echo "Error: Docker is not installed or not on PATH."; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Error: Docker is installed but the daemon is not running."; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "Error: Docker Compose v2 is unavailable."; exit 1; }
	@$(COMPOSE) config --quiet || { echo "Error: compose.yaml is invalid."; exit 1; }
	@echo "OutageGym prerequisites are ready."

start: doctor
	@$(LEARNER_WORKSPACE) initialize "$(INCIDENT)"
	@$(COMPOSE) up -d --wait floci || { echo "Error: Floci failed to start."; exit 1; }
	@$(TERRAFORM) init -input=false -no-color || { echo "Error: Terraform initialization failed."; exit 1; }
	@$(TERRAFORM) apply -input=false -auto-approve -no-color || { echo "Error: Infrastructure provisioning failed."; exit 1; }
	@$(COMPOSE) up -d --build --wait || { echo "Error: OutageGym application services failed to start."; exit 1; }
	@echo "OutageGym is running."

status: doctor
	@$(COMPOSE) ps

stop: doctor
	@$(COMPOSE) down --remove-orphans || { echo "Error: OutageGym failed to stop."; exit 1; }
	@echo "OutageGym is stopped."

reset: doctor
	@$(LEARNER_WORKSPACE) reset "$(INCIDENT)"
	@$(COMPOSE) down --volumes --remove-orphans || { echo "Error: OutageGym cleanup failed."; exit 1; }
	@$(COMPOSE) up -d --wait floci || { echo "Error: Floci failed to restart after cleanup."; exit 1; }
	@$(TERRAFORM) init -input=false -no-color || { echo "Error: Terraform initialization failed."; exit 1; }
	@$(TERRAFORM) apply -input=false -auto-approve -no-color || { echo "Error: Infrastructure provisioning failed."; exit 1; }
	@$(COMPOSE) up -d --build --wait || { echo "Error: OutageGym application services failed to restart."; exit 1; }
	@echo "OutageGym was reset and is running."

workload: start
	@$(COMPOSE) --profile tools run --rm k6 run /workloads/k6/$(WORKLOAD_FILE)

test-e2e: start
	@$(COMPOSE) --profile tools run --rm --user "$(HOST_UID):$(HOST_GID)" -e HOME=/tmp node npm ci --ignore-scripts
	@$(COMPOSE) --profile tools run --rm node node tests/e2e/healthy-order-flow.mjs
	@$(COMPOSE) --profile tools run --rm node node tests/e2e/duplicate-delivery.mjs

test-observability: start
	@$(COMPOSE) --profile tools run --rm node node tests/observability/foundation.mjs

test-incident: reset
	@$(COMPOSE) --profile tools run --rm k6 run /workloads/k6/$(WORKLOAD_FILE)
	@$(COMPOSE) --profile tools run --rm node node tests/incidents/$(INCIDENT).mjs
