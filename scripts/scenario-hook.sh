#!/bin/sh

set -eu

incident=${1:-}
hook=${2:-}

if ! printf '%s' "$incident" | grep -Eq '^inc-[0-9]{3}$'; then
  echo "Error: incident ID must use the inc-NNN format." >&2
  exit 1
fi

case "$hook" in
  before-start|after-start|before-reset|after-reset|before-stop|after-stop|seed|inject-fault|grade)
    ;;
  *)
    echo "Error: unsupported scenario hook: $hook" >&2
    exit 1
    ;;
esac

repository_root=$(git rev-parse --show-toplevel)
scenarios_root=${OUTAGEGYM_SCENARIOS_ROOT:-"$repository_root/scenarios"}
scenario_directory="$scenarios_root/$incident"
hook_path="$scenario_directory/hooks/$hook.sh"

if [ ! -d "$scenario_directory" ]; then
  echo "Error: scenario does not exist: $incident" >&2
  exit 1
fi

if [ ! -e "$hook_path" ]; then
  exit 0
fi

if [ ! -f "$hook_path" ] || [ ! -x "$hook_path" ]; then
  echo "Error: scenario hook must be an executable file: $hook_path" >&2
  exit 1
fi

export INCIDENT_ID="$incident"
export OUTAGEGYM_COMPOSE_PROJECT="outagegym-$incident"
export OUTAGEGYM_HOOK="$hook"
export OUTAGEGYM_REPOSITORY_ROOT="$repository_root"
export OUTAGEGYM_SCENARIO_DIR="$scenario_directory"

"$hook_path"
