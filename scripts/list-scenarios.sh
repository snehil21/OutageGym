#!/bin/sh

set -eu

repository_root=$(git rev-parse --show-toplevel)
scenarios_root=${OUTAGEGYM_SCENARIOS_ROOT:-"$repository_root/scenarios"}

printf '%-10s %-14s %s\n' "INCIDENT" "DIFFICULTY" "TITLE"

find "$scenarios_root" -mindepth 2 -maxdepth 2 -name manifest.yaml -print \
  | sort \
  | while IFS= read -r manifest
    do
      incident=$(sed -n 's/^id: //p' "$manifest")
      title=$(sed -n 's/^title: //p' "$manifest")
      difficulty=$(
        awk '
          /^difficulty:/ { in_difficulty = 1; next }
          in_difficulty && /^  level:/ { sub(/^  level: /, ""); print; exit }
          in_difficulty && /^[^ ]/ { exit }
        ' "$manifest"
      )

      printf '%-10s %-14s %s\n' "$incident" "$difficulty" "$title"
    done
