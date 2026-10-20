from dataclasses import dataclass

import boto3
from botocore.client import BaseClient
from botocore.config import Config

from outagegym_grader.config import GraderConfig


@dataclass(frozen=True)
class AwsClients:
    sqs: BaseClient
    dynamodb: BaseClient


def create_aws_clients(config: GraderConfig) -> AwsClients:
    session = boto3.Session(
        aws_access_key_id=config.aws_access_key_id,
        aws_secret_access_key=config.aws_secret_access_key,
        region_name=config.aws_region,
    )
    client_config = Config(
        connect_timeout=2,
        read_timeout=5,
        retries={"max_attempts": 2, "mode": "standard"},
    )

    return AwsClients(
        sqs=session.client(
            "sqs",
            endpoint_url=config.aws_endpoint_url,
            config=client_config,
        ),
        dynamodb=session.client(
            "dynamodb",
            endpoint_url=config.aws_endpoint_url,
            config=client_config,
        ),
    )
