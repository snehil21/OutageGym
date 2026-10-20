import time
from typing import Any

from botocore.client import BaseClient


POLL_INTERVAL_SECONDS = 0.25
ORDER_COMPLETION_TIMEOUT_SECONDS = 45


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


def read_queue_depth(sqs: BaseClient, queue_url: str) -> int:
    response = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=[
            "ApproximateNumberOfMessages",
            "ApproximateNumberOfMessagesNotVisible",
        ],
    )
    attributes = response.get("Attributes", {})

    return sum(
        int(attributes.get(name, "0"))
        for name in (
            "ApproximateNumberOfMessages",
            "ApproximateNumberOfMessagesNotVisible",
        )
    )


def queue_is_empty(sqs: BaseClient, queue_url: str) -> bool:
    return read_queue_depth(sqs, queue_url) == 0


def wait_for_queue_depth(
    sqs: BaseClient,
    queue_url: str,
    maximum_depth: int,
    timeout_seconds: float = 60,
) -> None:
    deadline = time.monotonic() + timeout_seconds

    while time.monotonic() < deadline:
        if read_queue_depth(sqs, queue_url) <= maximum_depth:
            return

        time.sleep(POLL_INTERVAL_SECONDS)

    raise AssertionError(
        f"Queue depth did not return to {maximum_depth} or lower within "
        f"{timeout_seconds:g} seconds"
    )


def wait_for_completed_order(
    dynamodb: BaseClient,
    table_name: str,
    order_id: str,
    timeout_seconds: float = ORDER_COMPLETION_TIMEOUT_SECONDS,
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
