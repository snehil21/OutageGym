from datetime import UTC, datetime
import json
from uuid import uuid4

from outagegym_grader.assessment import wait_for_completed_order
from outagegym_grader.aws import create_aws_clients
from outagegym_grader.config import load_config


def test_duplicate_delivery_creates_one_fulfilment() -> None:
    config = load_config()
    clients = create_aws_clients(config)
    order_id = f"order-grader-duplicate-{uuid4()}"
    correlation_id = f"correlation-grader-duplicate-{uuid4()}"
    message_body = json.dumps(
        {
            "schemaVersion": 1,
            "orderId": order_id,
            "correlationId": correlation_id,
            "acceptedAt": datetime.now(UTC).isoformat(),
            "productId": "product-grader-duplicate-001",
            "quantity": 2,
        }
    )

    try:
        for _ in range(2):
            clients.sqs.send_message(
                QueueUrl=config.order_processing_queue_url,
                MessageBody=message_body,
            )

        records = wait_for_completed_order(
            clients.dynamodb,
            config.order_records_table_name,
            order_id,
            timeout_seconds=45,
            settle_seconds=3,
        )
    finally:
        clients.sqs.close()
        clients.dynamodb.close()

    order = next(
        record for record in records if record["recordId"]["S"] == "ORDER"
    )
    fulfilments = [
        record
        for record in records
        if record.get("recordType", {}).get("S") == "FULFILMENT"
    ]

    assert order["status"]["S"] == "COMPLETED"
    assert order["correlationId"]["S"] == correlation_id
    assert len(fulfilments) == 1
    assert fulfilments[0]["correlationId"]["S"] == correlation_id
