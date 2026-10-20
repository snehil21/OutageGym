INCIDENT ?= inc-001
ID ?=
COMPOSE_PROJECT := outagegym-$(INCIDENT)
SCENARIO_ENV := $(wildcard scenarios/$(INCIDENT)/fault-config/runtime.env)
LOCAL_ENV := $(wildcard .env)
COMPOSE_ENV := $(if $(LOCAL_ENV),--env-file "$(LOCAL_ENV)") \
	$(if $(SCENARIO_ENV),--env-file "$(SCENARIO_ENV)")
COMPOSE := INCIDENT_ID="$(INCIDENT)" docker compose $(COMPOSE_ENV) -p "$(COMPOSE_PROJECT)" -f compose.yaml
WORKLOAD_FILE := $(if $(wildcard workloads/k6/$(INCIDENT).js),$(INCIDENT).js,happy-path.js)
HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)
TERRAFORM := $(COMPOSE) --profile tools run --rm --user "$(HOST_UID):$(HOST_GID)" -e HOME=/tmp terraform
LEARNER_WORKSPACE := ./scripts/learner-workspace.sh
SCENARIO_VALIDATOR := $(COMPOSE) --profile tools run --rm --build scenario-validator "$(INCIDENT)"
ALL_SCENARIO_VALIDATOR := $(COMPOSE) --profile tools run --rm --build scenario-validator --all
SCENARIO_HOOK := ./scripts/scenario-hook.sh "$(INCIDENT)"
SCENARIO_GRADE_HOOK := scenarios/$(INCIDENT)/hooks/grade.sh
NEW_SCENARIO_VALIDATOR := INCIDENT_ID="$(ID)" docker compose -p "outagegym-$(ID)" -f compose.yaml --profile tools run --rm --build scenario-validator "$(ID)"

.PHONY: doctor validate-scenarios list new-incident start status stop reset workload grade grade-default test-e2e test-observability test-incident

doctor:
	@command -v docker >/dev/null 2>&1 || { echo "Error: Docker is not installed or not on PATH."; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Error: Docker is installed but the daemon is not running."; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "Error: Docker Compose v2 is unavailable."; exit 1; }
	@$(COMPOSE) config --quiet || { echo "Error: compose.yaml is invalid."; exit 1; }
	@$(SCENARIO_VALIDATOR) || { echo "Error: scenario manifest is invalid."; exit 1; }
	@echo "OutageGym prerequisites are ready."

validate-scenarios:
	@$(ALL_SCENARIO_VALIDATOR)

list:
	@./scripts/list-scenarios.sh

new-incident:
	@./scripts/new-incident.sh "$(ID)"
	@$(NEW_SCENARIO_VALIDATOR) || { echo "Error: generated scenario manifest is invalid."; exit 1; }

start: doctor
	@$(LEARNER_WORKSPACE) initialize "$(INCIDENT)"
	@$(SCENARIO_HOOK) before-start
	@$(COMPOSE) up -d --wait floci || { echo "Error: Floci failed to start."; exit 1; }
	@$(TERRAFORM) init -input=false -no-color || { echo "Error: Terraform initialization failed."; exit 1; }
	@$(TERRAFORM) apply -input=false -auto-approve -no-color || { echo "Error: Infrastructure provisioning failed."; exit 1; }
	@$(SCENARIO_HOOK) seed
	@$(SCENARIO_HOOK) inject-fault
	@$(COMPOSE) up -d --build --wait || { echo "Error: OutageGym application services failed to start."; exit 1; }
	@$(SCENARIO_HOOK) after-start
	@echo "OutageGym is running."

status: doctor
	@$(COMPOSE) ps

stop: doctor
	@$(SCENARIO_HOOK) before-stop
	@$(COMPOSE) down --remove-orphans || { echo "Error: OutageGym failed to stop."; exit 1; }
	@$(SCENARIO_HOOK) after-stop
	@echo "OutageGym is stopped."

reset: doctor
	@$(SCENARIO_HOOK) before-reset
	@$(LEARNER_WORKSPACE) reset "$(INCIDENT)"
	@$(COMPOSE) down --volumes --remove-orphans || { echo "Error: OutageGym cleanup failed."; exit 1; }
	@$(COMPOSE) up -d --wait floci || { echo "Error: Floci failed to restart after cleanup."; exit 1; }
	@$(TERRAFORM) init -input=false -no-color || { echo "Error: Terraform initialization failed."; exit 1; }
	@$(TERRAFORM) apply -input=false -auto-approve -no-color || { echo "Error: Infrastructure provisioning failed."; exit 1; }
	@$(SCENARIO_HOOK) seed
	@$(SCENARIO_HOOK) inject-fault
	@$(COMPOSE) up -d --build --wait || { echo "Error: OutageGym application services failed to restart."; exit 1; }
	@$(SCENARIO_HOOK) after-reset
	@echo "OutageGym was reset and is running."

workload: start
	@$(COMPOSE) --profile tools run --rm k6 run /workloads/k6/$(WORKLOAD_FILE)

grade: doctor
	@$(COMPOSE) up -d --build --wait order-api order-worker || { echo "Error: Application services failed to start for grading."; exit 1; }
	@if [ -e "$(SCENARIO_GRADE_HOOK)" ]; then \
		$(SCENARIO_HOOK) grade; \
	else \
		$(MAKE) --no-print-directory grade-default INCIDENT="$(INCIDENT)"; \
	fi

grade-default:
	@$(COMPOSE) --profile tools build grader || { echo "Error: Grader image failed to build."; exit 1; }
	@$(COMPOSE) --profile tools run --rm grader || { echo "Error: Behavioural assessment failed."; exit 1; }
	@$(COMPOSE) restart --timeout 15 order-worker || { echo "Error: Order worker failed to restart."; exit 1; }
	@$(COMPOSE) up -d --wait order-worker || { echo "Error: Order worker was not ready after restart."; exit 1; }
	@$(COMPOSE) --profile tools run --rm grader python -m outagegym_grader.report --tests tests/test_order_flow.py || { echo "Error: Repair did not survive the order-worker restart."; exit 1; }
	@echo "OutageGym behavioural assessment passed."

test-e2e: start
	@$(COMPOSE) --profile tools run --rm --user "$(HOST_UID):$(HOST_GID)" -e HOME=/tmp node npm ci --ignore-scripts
	@$(COMPOSE) --profile tools run --rm node node tests/e2e/healthy-order-flow.mjs
	@$(COMPOSE) --profile tools run --rm node node tests/e2e/duplicate-delivery.mjs

test-observability: start
	@$(COMPOSE) --profile tools run --rm node node tests/observability/foundation.mjs

test-incident: reset
	@$(COMPOSE) --profile tools run --rm k6 run /workloads/k6/$(WORKLOAD_FILE)
	@$(COMPOSE) --profile tools run --rm node node tests/incidents/$(INCIDENT).mjs
