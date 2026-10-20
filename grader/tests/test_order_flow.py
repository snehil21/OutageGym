from outagegym_grader.assessment import wait_for_completed_order
from outagegym_grader.aws import create_aws_clients
from outagegym_grader.config import load_config
from outagegym_grader.order_api import submit_order


EXPECTED_PRODUCT_ID = "product-grader-healthy-001"
EXPECTED_QUANTITY = 3


def test_submitted_order_reaches_expected_final_state() -> None:
    config = load_config()
    clients = create_aws_clients(config)

    try:
        accepted = submit_order(
            config.order_api_url,
            EXPECTED_PRODUCT_ID,
            EXPECTED_QUANTITY,
        )
        records = wait_for_completed_order(
            clients.dynamodb,
            config.order_records_table_name,
            accepted.order_id,
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
    assert order["productId"]["S"] == EXPECTED_PRODUCT_ID
    assert order["quantity"]["N"] == str(EXPECTED_QUANTITY)
    assert order["correlationId"]["S"] == accepted.correlation_id
    assert len(fulfilments) == 1
    assert fulfilments[0]["correlationId"]["S"] == accepted.correlation_id
