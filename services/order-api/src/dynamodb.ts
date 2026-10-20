import {
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import type { AppConfig } from "./config.js";

type DynamoDbConfig = Pick<AppConfig, "awsEndpointUrl" | "awsRegion">;

export const createDynamoDbClient = (
  config: DynamoDbConfig,
): DynamoDBClient =>
  new DynamoDBClient({
    endpoint: config.awsEndpointUrl,
    region: config.awsRegion,
    credentials: {
      accessKeyId: "outagegym-local",
      secretAccessKey: "outagegym-local-only",
    },
  });

export const checkTableReady = async (
  dynamodb: DynamoDBClient,
  tableName: string,
): Promise<void> => {
  await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
};
