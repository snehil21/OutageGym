#!/bin/sh

set -eu

event_bus_name="outagegym-${INCIDENT_ID}-notification-events"
queue_name="outagegym-${INCIDENT_ID}-notification-delivery"
rule_name="outagegym-${INCIDENT_ID}-notification-routing"
queue_arn="arn:aws:sqs:us-east-1:000000000000:${queue_name}"
event_pattern=$(cat "$OUTAGEGYM_SCENARIO_DIR/fault-config/event-pattern.json")

aws_cli() {
  INCIDENT_ID="$INCIDENT_ID" docker compose \
    -p "$OUTAGEGYM_COMPOSE_PROJECT" \
    -f "$OUTAGEGYM_REPOSITORY_ROOT/compose.yaml" \
    --profile tools run --rm aws "$@"
}

aws_cli events put-rule \
  --name "$rule_name" \
  --event-bus-name "$event_bus_name" \
  --event-pattern "$event_pattern" \
  >/dev/null

aws_cli events put-targets \
  --event-bus-name "$event_bus_name" \
  --rule "$rule_name" \
  --targets "Id=notification-delivery,Arn=${queue_arn}" \
  >/dev/null
