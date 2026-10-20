#!/bin/sh

set -eu

incident=${1:-}

if ! printf '%s' "$incident" | grep -Eq '^inc-[0-9]{3}$'; then
  echo "Error: ID must use the inc-NNN format." >&2
  exit 1
fi

repository_root=$(git rev-parse --show-toplevel)
scenarios_root=${OUTAGEGYM_SCENARIOS_ROOT:-"$repository_root/scenarios"}
template_root=${OUTAGEGYM_SCENARIO_TEMPLATE_ROOT:-"$repository_root/templates/scenario"}
target="$scenarios_root/$incident"

if [ -e "$target" ]; then
  echo "Error: scenario already exists: $incident" >&2
  exit 1
fi

mkdir -p "$scenarios_root"
cp -R "$template_root" "$target"

find "$target" -type f -print | while IFS= read -r file
do
  temporary_file="$file.tmp.$$"
  sed "s/{{INCIDENT_ID}}/$incident/g" "$file" >"$temporary_file"
  mv "$temporary_file" "$file"
done

echo "Created scenario $incident at $target."
