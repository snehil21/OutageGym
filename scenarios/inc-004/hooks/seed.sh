#!/bin/sh

set -eu

poison_body=$(cat "$OUTAGEGYM_SCENARIO_DIR/fault-config/poison-message.json")
queue_url="http://floci:4566/000000000000/outagegym-${INCIDENT_ID}-order-processing"

aws_cli() {
  INCIDENT_ID="$INCIDENT_ID" docker compose \
    -p "$OUTAGEGYM_COMPOSE_PROJECT" \
    -f "$OUTAGEGYM_REPOSITORY_ROOT/compose.yaml" \
    --profile tools run --rm aws "$@"
}

set -- $(
  aws_cli sqs get-queue-attributes \
    --queue-url "$queue_url" \
    --attribute-names \
      ApproximateNumberOfMessages \
      ApproximateNumberOfMessagesNotVisible \
    --query '[Attributes.ApproximateNumberOfMessages,Attributes.ApproximateNumberOfMessagesNotVisible]' \
    --output text
)

if [ "${1:-0}" -gt 0 ] || [ "${2:-0}" -gt 0 ]; then
  echo "Malformed order messages are already present; seed skipped."
  exit 0
fi

message_number=1
while [ "$message_number" -le 8 ]; do
  aws_cli sqs send-message \
    --queue-url "$queue_url" \
    --message-body "$poison_body" \
    --message-attributes \
      "incident={DataType=String,StringValue=inc-004},poisonSequence={DataType=Number,StringValue=${message_number}}" \
    >/dev/null
  message_number=$((message_number + 1))
done

echo "Seeded eight malformed order messages."
