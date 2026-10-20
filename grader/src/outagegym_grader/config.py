from collections.abc import Mapping
from dataclasses import dataclass
import os
from urllib.parse import urlparse


LOCAL_AWS_HOSTS = frozenset({"floci", "localhost", "127.0.0.1"})
LOCAL_ACCESS_KEY_ID = "outagegym-local"
LOCAL_SECRET_ACCESS_KEY = "outagegym-local-only"


@dataclass(frozen=True)
class GraderConfig:
    aws_endpoint_url: str
    aws_region: str
    aws_access_key_id: str
    aws_secret_access_key: str
    order_processing_queue_url: str
    order_records_table_name: str


def _required(environment: Mapping[str, str], name: str) -> str:
    value = environment.get(name, "").strip()

    if not value:
        raise ValueError(f"Missing required environment variable: {name}")

    return value


def _local_aws_url(environment: Mapping[str, str], name: str) -> str:
    value = _required(environment, name)
    parsed = urlparse(value)

    if (
        parsed.scheme != "http"
        or parsed.hostname not in LOCAL_AWS_HOSTS
        or parsed.port != 4566
    ):
        raise ValueError(
            f"{name} must target the local Floci endpoint on port 4566"
        )

    return value


def load_config(
    environment: Mapping[str, str] = os.environ,
) -> GraderConfig:
    access_key_id = environment.get("AWS_ACCESS_KEY_ID", LOCAL_ACCESS_KEY_ID)
    secret_access_key = environment.get(
        "AWS_SECRET_ACCESS_KEY",
        LOCAL_SECRET_ACCESS_KEY,
    )

    if (
        access_key_id != LOCAL_ACCESS_KEY_ID
        or secret_access_key != LOCAL_SECRET_ACCESS_KEY
    ):
        raise ValueError("The grader only accepts OutageGym local credentials")

    return GraderConfig(
        aws_endpoint_url=_local_aws_url(environment, "AWS_ENDPOINT_URL"),
        aws_region=environment.get("AWS_REGION", "us-east-1"),
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        order_processing_queue_url=_local_aws_url(
            environment,
            "ORDER_PROCESSING_QUEUE_URL",
        ),
        order_records_table_name=_required(
            environment,
            "ORDER_RECORDS_TABLE_NAME",
        ),
    )
