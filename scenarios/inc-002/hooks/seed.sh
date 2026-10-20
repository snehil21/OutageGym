#!/bin/sh

set -eu

event_bus_name="outagegym-${INCIDENT_ID}-notification-events"
queue_name="outagegym-${INCIDENT_ID}-notification-delivery"
table_name="outagegym-${INCIDENT_ID}-notification-records"

aws_cli() {
  INCIDENT_ID="$INCIDENT_ID" docker compose \
    -p "$OUTAGEGYM_COMPOSE_PROJECT" \
    -f "$OUTAGEGYM_REPOSITORY_ROOT/compose.yaml" \
    --profile tools run --rm aws "$@"
}

if ! aws_cli events describe-event-bus --name "$event_bus_name" >/dev/null 2>&1; then
  aws_cli events create-event-bus --name "$event_bus_name" >/dev/null
fi

aws_cli sqs create-queue --queue-name "$queue_name" >/dev/null

if ! aws_cli dynamodb describe-table --table-name "$table_name" >/dev/null 2>&1; then
  aws_cli dynamodb create-table \
    --table-name "$table_name" \
    --attribute-definitions AttributeName=orderId,AttributeType=S \
    --key-schema AttributeName=orderId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
fi

aws_cli dynamodb wait table-exists --table-name "$table_name"
