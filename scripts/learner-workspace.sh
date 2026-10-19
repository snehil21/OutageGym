#!/bin/sh

set -eu

action=${1:-}
incident=${2:-}

if ! printf '%s' "$incident" | grep -Eq '^[a-z0-9-]+$'; then
  echo "Error: incident ID must contain only lowercase letters, numbers, and hyphens." >&2
  exit 1
fi

repository_root=$(git rev-parse --show-toplevel)
cd "$repository_root"

state_directory=".outagegym/state/$incident"
baseline_file="$state_directory/baseline.commit"
archive_directory=".outagegym/archives/$incident"

set -- \
  compose.yaml \
  package.json \
  package-lock.json \
  infra/terraform \
  services/order-api \
  services/order-worker \
  "scenarios/$incident/fault-config" \
  "scenarios/$incident/evidence.md" \
  "scenarios/$incident/postmortem-template.md"

initialize() {
  if [ -f "$baseline_file" ]; then
    return
  fi

  mkdir -p "$state_directory"
  git rev-parse HEAD >"$baseline_file"
  echo "Recorded learner workspace baseline for $incident."
}

archive_and_restore() {
  initialize

  baseline=$(sed -n '1p' "$baseline_file")
  git cat-file -e "$baseline^{commit}"

  tracked_changes=false
  untracked_files=$(git ls-files --others --exclude-standard -- "$@")

  if ! git diff --quiet "$baseline" -- "$@"; then
    tracked_changes=true
  fi

  if [ "$tracked_changes" = true ] || [ -n "$untracked_files" ]; then
    timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
    archive="$archive_directory/$timestamp-$$"
    mkdir -p "$archive"

    git diff --binary "$baseline" -- "$@" >"$archive/changes.patch"
    printf '%s\n' "$untracked_files" >"$archive/untracked-files.txt"

    if [ -n "$untracked_files" ]; then
      tar -czf "$archive/untracked-files.tar.gz" -T "$archive/untracked-files.txt"
    fi

    {
      printf 'incident=%s\n' "$incident"
      printf 'baseline_commit=%s\n' "$baseline"
      printf 'archived_head=%s\n' "$(git rev-parse HEAD)"
      printf 'archived_at=%s\n' "$timestamp"
    } >"$archive/metadata.env"

    echo "Archived learner work to $archive."
  else
    echo "No learner work required archiving."
  fi

  git restore --source "$baseline" --staged --worktree -- "$@"
  git clean -fd -- "$@" >/dev/null
  echo "Restored learner workspace baseline for $incident."
}

case "$action" in
  initialize)
    initialize
    ;;
  reset)
    archive_and_restore "$@"
    ;;
  *)
    echo "Usage: $0 initialize|reset INCIDENT" >&2
    exit 1
    ;;
esac
