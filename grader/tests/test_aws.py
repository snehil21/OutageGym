from collections.abc import Iterator

import pytest

from outagegym_grader.aws import AwsClients, create_aws_clients
from outagegym_grader.config import load_config


@pytest.fixture
def aws_clients() -> Iterator[AwsClients]:
    clients = create_aws_clients(load_config())

    try:
        yield clients
    finally:
        clients.sqs.close()
        clients.dynamodb.close()


def test_order_processing_queue_is_available(aws_clients: AwsClients) -> None:
    config = load_config()
    response = aws_clients.sqs.get_queue_attributes(
        QueueUrl=config.order_processing_queue_url,
        AttributeNames=["QueueArn"],
    )

    queue_arn = response["Attributes"]["QueueArn"]
    assert queue_arn.endswith(f":{config.order_processing_queue_url.rsplit('/', 1)[-1]}")


def test_order_records_table_is_available(aws_clients: AwsClients) -> None:
    config = load_config()
    response = aws_clients.dynamodb.describe_table(
        TableName=config.order_records_table_name,
    )

    table = response["Table"]
    assert table["TableName"] == config.order_records_table_name
    assert table["TableStatus"] == "ACTIVE"
