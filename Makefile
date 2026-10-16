.PHONY: doctor start status stop reset

doctor:
	@command -v docker >/dev/null 2>&1 || { echo "Error: Docker is not installed or not on PATH."; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Error: Docker is installed but the daemon is not running."; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "Error: Docker Compose v2 is unavailable."; exit 1; }
	@docker compose -f compose.yaml config --quiet || { echo "Error: compose.yaml is invalid."; exit 1; }
	@echo "OutageGym prerequisites are ready."

start: doctor
	@docker compose -f compose.yaml up -d --wait || { echo "Error: OutageGym failed to start."; exit 1; }
	@echo "OutageGym is running."

status: doctor
	@docker compose -f compose.yaml ps

stop: doctor
	@docker compose -f compose.yaml down --remove-orphans || { echo "Error: OutageGym failed to stop."; exit 1; }
	@echo "OutageGym is stopped."

reset: doctor
	@docker compose -f compose.yaml down --volumes --remove-orphans || { echo "Error: OutageGym cleanup failed."; exit 1; }
	@docker compose -f compose.yaml up -d --wait || { echo "Error: OutageGym failed to restart after cleanup."; exit 1; }
	@echo "OutageGym was reset and is running."
