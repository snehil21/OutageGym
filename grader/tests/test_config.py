import pytest

from outagegym_grader.config import (
    LOCAL_ACCESS_KEY_ID,
    LOCAL_SECRET_ACCESS_KEY,
    load_config,
)


def local_environment() -> dict[str, str]:
    return {
        "AWS_ENDPOINT_URL": "http://floci:4566",
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": LOCAL_ACCESS_KEY_ID,
        "AWS_SECRET_ACCESS_KEY": LOCAL_SECRET_ACCESS_KEY,
        "INCIDENT_ID": "inc-001",
        "ORDER_API_URL": "http://order-api:3000",
        "ORDER_PROCESSING_QUEUE_URL": (
            "http://floci:4566/000000000000/"
            "outagegym-inc-001-order-processing"
        ),
        "ORDER_RECORDS_TABLE_NAME": "outagegym-inc-001-order-records",
    }


def test_load_config_accepts_local_floci_settings() -> None:
    config = load_config(local_environment())

    assert config.aws_endpoint_url == "http://floci:4566"
    assert config.aws_region == "us-east-1"
    assert config.aws_access_key_id == LOCAL_ACCESS_KEY_ID
    assert config.aws_secret_access_key == LOCAL_SECRET_ACCESS_KEY
    assert config.incident_id == "inc-001"
    assert config.order_api_url == "http://order-api:3000"
    assert config.order_processing_queue_url.endswith(
        "/outagegym-inc-001-order-processing"
    )
    assert config.order_records_table_name == "outagegym-inc-001-order-records"


def test_load_config_rejects_non_local_aws_endpoint() -> None:
    environment = local_environment()
    environment["AWS_ENDPOINT_URL"] = "https://sqs.us-east-1.amazonaws.com"

    with pytest.raises(
        ValueError,
        match="AWS_ENDPOINT_URL must target the local Floci endpoint",
    ):
        load_config(environment)


def test_load_config_rejects_non_local_credentials() -> None:
    environment = local_environment()
    environment["AWS_ACCESS_KEY_ID"] = "real-looking-access-key"
    environment["AWS_SECRET_ACCESS_KEY"] = "real-looking-secret"

    with pytest.raises(
        ValueError,
        match="only accepts OutageGym local credentials",
    ):
        load_config(environment)


def test_load_config_rejects_non_local_order_api() -> None:
    environment = local_environment()
    environment["ORDER_API_URL"] = "https://orders.example.com"

    with pytest.raises(
        ValueError,
        match="ORDER_API_URL must target the local Order API endpoint",
    ):
        load_config(environment)


def test_load_config_rejects_unsafe_incident_id() -> None:
    environment = local_environment()
    environment["INCIDENT_ID"] = "../real-aws"

    with pytest.raises(
        ValueError,
        match="INCIDENT_ID must contain only lowercase letters",
    ):
        load_config(environment)


@pytest.mark.parametrize("name", ["INCIDENT_ID", "ORDER_API_URL"])
def test_load_config_requires_shared_runtime_values(name: str) -> None:
    environment = local_environment()
    del environment[name]

    with pytest.raises(
        ValueError,
        match=f"Missing required environment variable: {name}",
    ):
        load_config(environment)
