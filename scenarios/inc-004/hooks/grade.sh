#!/bin/sh

set -eu

compose() {
  INCIDENT_ID="$INCIDENT_ID" docker compose \
    --env-file "$OUTAGEGYM_SCENARIO_DIR/fault-config/runtime.env" \
    -p "$OUTAGEGYM_COMPOSE_PROJECT" \
    -f "$OUTAGEGYM_REPOSITORY_ROOT/compose.yaml" "$@"
}

compose up -d --build --wait order-api order-worker
compose --profile tools run --rm node \
  node tests/incidents/inc-004-repair.mjs

compose restart --timeout 15 order-worker
compose up -d --wait order-worker
compose --profile tools run --rm -e GRADE_PHASE=restart node \
  node tests/incidents/inc-004-repair.mjs

echo "INC-004 behavioural assessment passed."
