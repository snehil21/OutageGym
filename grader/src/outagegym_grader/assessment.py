import time
from typing import Any

from botocore.client import BaseClient


POLL_INTERVAL_SECONDS = 0.25


def read_order_records(
    dynamodb: BaseClient,
    table_name: str,
    order_id: str,
) -> list[dict[str, Any]]:
    response = dynamodb.query(
        TableName=table_name,
        KeyConditionExpression="orderId = :order_id",
        ExpressionAttributeValues={
            ":order_id": {"S": order_id},
        },
        ConsistentRead=True,
    )

    return response.get("Items", [])


def queue_is_empty(sqs: BaseClient, queue_url: str) -> bool:
    response = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=[
            "ApproximateNumberOfMessages",
            "ApproximateNumberOfMessagesNotVisible",
        ],
    )
    attributes = response.get("Attributes", {})

    return (
        attributes.get("ApproximateNumberOfMessages") == "0"
        and attributes.get("ApproximateNumberOfMessagesNotVisible") == "0"
    )


def wait_for_completed_order(
    dynamodb: BaseClient,
    table_name: str,
    order_id: str,
    timeout_seconds: float = 20,
    *,
    settle_seconds: float = 0,
) -> list[dict[str, Any]]:
    deadline = time.monotonic() + timeout_seconds
    completed_since: float | None = None

    while time.monotonic() < deadline:
        records = read_order_records(dynamodb, table_name, order_id)
        order = next(
            (
                record
                for record in records
                if record.get("recordId", {}).get("S") == "ORDER"
            ),
            None,
        )
        completed = (
            order is not None
            and order.get("status", {}).get("S") == "COMPLETED"
        )

        if completed:
            completed_since = completed_since or time.monotonic()

            if time.monotonic() - completed_since >= settle_seconds:
                return records
        else:
            completed_since = None

        time.sleep(POLL_INTERVAL_SECONDS)

    raise AssertionError(
        f"Order {order_id} did not complete and settle within "
        f"{timeout_seconds:g} seconds"
    )
