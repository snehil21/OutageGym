from collections.abc import Mapping
from dataclasses import dataclass
import os
import re
from urllib.parse import urlparse


LOCAL_AWS_HOSTS = frozenset({"floci", "localhost", "127.0.0.1"})
LOCAL_ORDER_API_HOSTS = frozenset({"order-api", "localhost", "127.0.0.1"})
LOCAL_ACCESS_KEY_ID = "outagegym-local"
LOCAL_SECRET_ACCESS_KEY = "outagegym-local-only"


@dataclass(frozen=True)
class GraderConfig:
    aws_endpoint_url: str
    aws_region: str
    aws_access_key_id: str
    aws_secret_access_key: str
    incident_id: str
    order_api_url: str
    order_processing_queue_url: str
    order_records_table_name: str


def _required(environment: Mapping[str, str], name: str) -> str:
    value = environment.get(name, "").strip()

    if not value:
        raise ValueError(f"Missing required environment variable: {name}")

    return value


def _incident_id(environment: Mapping[str, str]) -> str:
    value = _required(environment, "INCIDENT_ID")

    if re.fullmatch(r"[a-z0-9-]+", value) is None:
        raise ValueError(
            "INCIDENT_ID must contain only lowercase letters, numbers, and hyphens"
        )

    return value


def _local_url(
    value: str,
    name: str,
    allowed_hosts: frozenset[str],
    expected_port: int,
    service_name: str,
) -> str:
    parsed = urlparse(value)

    if (
        parsed.scheme != "http"
        or parsed.hostname not in allowed_hosts
        or parsed.port != expected_port
    ):
        raise ValueError(
            f"{name} must target the local {service_name} endpoint "
            f"on port {expected_port}"
        )

    return value


def _local_aws_url(environment: Mapping[str, str], name: str) -> str:
    return _local_url(
        _required(environment, name),
        name,
        LOCAL_AWS_HOSTS,
        4566,
        "Floci",
    )


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
        incident_id=_incident_id(environment),
        order_api_url=_local_url(
            _required(environment, "ORDER_API_URL"),
            "ORDER_API_URL",
            LOCAL_ORDER_API_HOSTS,
            3000,
            "Order API",
        ),
        order_processing_queue_url=_local_aws_url(
            environment,
            "ORDER_PROCESSING_QUEUE_URL",
        ),
        order_records_table_name=_required(
            environment,
            "ORDER_RECORDS_TABLE_NAME",
        ),
    )
