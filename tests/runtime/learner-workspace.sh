#!/bin/sh

set -eu

repository_root=$(git rev-parse --show-toplevel)
test_root=$(mktemp -d)
trap 'rm -rf "$test_root"' EXIT

remote="$test_root/remote.git"
workspace="$test_root/workspace"

git init --bare --quiet "$remote"
git init --quiet --initial-branch=main "$workspace"
cd "$workspace"

git config user.name "OutageGym CI"
git config user.email "ci@outagegym.local"
git remote add origin "$remote"

mkdir -p \
  infra/terraform \
  services/order-api \
  services/order-worker \
  scenarios/inc-001/fault-config

printf '.outagegym/\n' >.gitignore
printf 'product=v1\n' >compose.yaml
printf '{}\n' >package.json
printf '{}\n' >package-lock.json
printf 'terraform-v1\n' >infra/terraform/main.tf
printf 'api-v1\n' >services/order-api/main.ts
printf 'worker-v1\n' >services/order-worker/main.ts
printf 'runtime-v1\n' >scenarios/inc-001/fault-config/runtime.env
printf 'evidence-v1\n' >scenarios/inc-001/evidence.md
printf 'postmortem-v1\n' >scenarios/inc-001/postmortem-template.md
git add .
git commit --quiet -m "product v1"
git push --quiet --set-upstream origin main

"$repository_root/scripts/learner-workspace.sh" initialize ci
"$repository_root/scripts/learner-workspace.sh" reset ci

"$repository_root/scripts/learner-workspace.sh" initialize inc-001
initial_baseline=$(cat .outagegym/state/inc-001/baseline.commit)

printf 'product=v2\n' >compose.yaml
git add compose.yaml
git commit --quiet -m "product v2"
git push --quiet
product_head=$(git rev-parse HEAD)

printf 'learner change\n' >>services/order-api/main.ts
"$repository_root/scripts/learner-workspace.sh" reset inc-001

test "$(cat .outagegym/state/inc-001/baseline.commit)" = "$product_head"
test "$initial_baseline" != "$product_head"
grep -q '^product=v2$' compose.yaml
test "$(cat services/order-api/main.ts)" = "api-v1"
grep -q 'learner change' .outagegym/archives/inc-001/*/changes.patch

printf 'committed learner change\n' >>services/order-worker/main.ts
git add services/order-worker/main.ts
git commit --quiet -m "learner repair"
learner_head=$(git rev-parse HEAD)

"$repository_root/scripts/learner-workspace.sh" reset inc-001

test "$learner_head" != "$product_head"
test "$(cat .outagegym/state/inc-001/baseline.commit)" = "$product_head"
test "$(cat services/order-worker/main.ts)" = "worker-v1"

echo "Learner workspace baseline refresh passed."
