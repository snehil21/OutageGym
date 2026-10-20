from outagegym_grader.assessment import (
    read_order_records,
    read_queue_depth,
    wait_for_completed_order,
    wait_for_queue_depth,
)
from outagegym_grader.aws import create_aws_clients
from outagegym_grader.config import load_config
from outagegym_grader.order_api import submit_order


WORKLOAD_ORDER_COUNT = 6
WORKLOAD_QUANTITY = 5


def test_bulk_order_backlog_returns_to_baseline() -> None:
    config = load_config()
    clients = create_aws_clients(config)
    baseline_depth = read_queue_depth(
        clients.sqs,
        config.order_processing_queue_url,
    )

    try:
        accepted_orders = [
            submit_order(
                config.order_api_url,
                f"product-grader-backlog-{index:03d}",
                WORKLOAD_QUANTITY,
            )
            for index in range(WORKLOAD_ORDER_COUNT)
        ]

        for accepted in accepted_orders:
            wait_for_completed_order(
                clients.dynamodb,
                config.order_records_table_name,
                accepted.order_id,
                timeout_seconds=60,
            )

        wait_for_queue_depth(
            clients.sqs,
            config.order_processing_queue_url,
            baseline_depth,
        )

        for accepted in accepted_orders:
            records = read_order_records(
                clients.dynamodb,
                config.order_records_table_name,
                accepted.order_id,
            )
            order = next(
                record
                for record in records
                if record["recordId"]["S"] == "ORDER"
            )
            fulfilments = [
                record
                for record in records
                if record.get("recordType", {}).get("S") == "FULFILMENT"
            ]

            assert order["status"]["S"] == "COMPLETED"
            assert order["correlationId"]["S"] == accepted.correlation_id
            assert len(fulfilments) == 1
    finally:
        clients.sqs.close()
        clients.dynamodb.close()
