#!/bin/sh

set -eu

repository_root=$(git rev-parse --show-toplevel)
fixture_root=$(mktemp -d)
trap 'rm -rf "$fixture_root"' EXIT

mkdir -p "$fixture_root/inc-999/hooks"

cat >"$fixture_root/inc-999/hooks/seed.sh" <<'EOF'
#!/bin/sh
set -eu
printf '%s\n' "$INCIDENT_ID|$OUTAGEGYM_HOOK|$OUTAGEGYM_COMPOSE_PROJECT|$OUTAGEGYM_SCENARIO_DIR"
EOF
chmod +x "$fixture_root/inc-999/hooks/seed.sh"

output=$(
  OUTAGEGYM_SCENARIOS_ROOT="$fixture_root" \
    "$repository_root/scripts/scenario-hook.sh" inc-999 seed
)

expected="inc-999|seed|outagegym-inc-999|$fixture_root/inc-999"

if [ "$output" != "$expected" ]; then
  echo "Error: scenario hook received an unexpected runtime contract." >&2
  exit 1
fi

OUTAGEGYM_SCENARIOS_ROOT="$fixture_root" \
  "$repository_root/scripts/scenario-hook.sh" inc-999 before-start

chmod -x "$fixture_root/inc-999/hooks/seed.sh"

if OUTAGEGYM_SCENARIOS_ROOT="$fixture_root" \
  "$repository_root/scripts/scenario-hook.sh" inc-999 seed 2>/dev/null
then
  echo "Error: a non-executable scenario hook was accepted." >&2
  exit 1
fi

echo "Scenario hook contract is valid."
