#!/bin/sh

set -eu

repository_root=$(git rev-parse --show-toplevel)
fixture_root=$(mktemp -d)
trap 'rm -rf "$fixture_root"' EXIT

scenarios_root="$fixture_root/workspace/scenarios"
mkdir -p "$scenarios_root" "$fixture_root/workspace/schemas"
cp "$repository_root/schemas/scenario-manifest.schema.json" \
  "$fixture_root/workspace/schemas/"

OUTAGEGYM_SCENARIOS_ROOT="$scenarios_root" \
  "$repository_root/scripts/new-incident.sh" inc-999 >/dev/null

test -f "$scenarios_root/inc-999/manifest.yaml"
test -f "$scenarios_root/inc-999/fault-config/runtime.env"
test -f "$scenarios_root/inc-999/seed/data.json"

if grep -R '{{INCIDENT_ID}}' "$scenarios_root/inc-999" >/dev/null; then
  echo "Error: generated scenario contains an unresolved placeholder." >&2
  exit 1
fi

listing=$(
  OUTAGEGYM_SCENARIOS_ROOT="$scenarios_root" \
    "$repository_root/scripts/list-scenarios.sh"
)

printf '%s\n' "$listing" | grep -F 'inc-999' >/dev/null
printf '%s\n' "$listing" | grep -F 'beginner' >/dev/null

if OUTAGEGYM_SCENARIOS_ROOT="$scenarios_root" \
  "$repository_root/scripts/new-incident.sh" inc-999 2>/dev/null
then
  echo "Error: duplicate scenario creation was accepted." >&2
  exit 1
fi

docker run --rm --network none \
  -v "$fixture_root/workspace:/workspace:ro" \
  outagegym/scenario-validator:local inc-999 >/dev/null

sed 's/^id: inc-999$/id: invalid/' \
  "$scenarios_root/inc-999/manifest.yaml" \
  >"$scenarios_root/inc-999/manifest.yaml.invalid"
mv "$scenarios_root/inc-999/manifest.yaml.invalid" \
  "$scenarios_root/inc-999/manifest.yaml"

if docker run --rm --network none \
  -v "$fixture_root/workspace:/workspace:ro" \
  outagegym/scenario-validator:local inc-999 >/dev/null 2>&1
then
  echo "Error: invalid generated manifest was accepted." >&2
  exit 1
fi

inc_998_config=$(
  INCIDENT_ID=inc-998 docker compose \
    -p outagegym-inc-998 -f "$repository_root/compose.yaml" \
    --profile tools config --format json
)
inc_997_config=$(
  INCIDENT_ID=inc-997 docker compose \
    -p outagegym-inc-997 -f "$repository_root/compose.yaml" \
    --profile tools config --format json
)

for resource in lab grafana-data loki-data prometheus-data
do
  printf '%s' "$inc_998_config" | grep -F "outagegym-inc-998_$resource" >/dev/null
  printf '%s' "$inc_997_config" | grep -F "outagegym-inc-997_$resource" >/dev/null
done

echo "Scenario authoring and isolation contracts are valid."
