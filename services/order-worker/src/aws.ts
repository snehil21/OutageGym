import {
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  GetQueueAttributesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import type { WorkerConfig } from "./config.js";

export interface AwsClients {
  sqs: SQSClient;
  dynamodb: DynamoDBClient;
  destroy(): void;
}

type AwsConfig = Pick<WorkerConfig, "awsEndpointUrl" | "awsRegion">;

export const createAwsClients = (config: AwsConfig): AwsClients => {
  const clientConfig = {
    endpoint: config.awsEndpointUrl,
    region: config.awsRegion,
    credentials: {
      accessKeyId: "outagegym-local",
      secretAccessKey: "outagegym-local-only",
    },
  };

  const sqs = new SQSClient(clientConfig);
  const dynamodb = new DynamoDBClient(clientConfig);

  return {
    sqs,
    dynamodb,
    destroy: () => {
      sqs.destroy();
      dynamodb.destroy();
    },
  };
};

export const checkAwsResourcesReady = async (
  clients: AwsClients,
  queueUrl: string,
  tableName: string,
): Promise<void> => {
  const [, table] = await Promise.all([
    clients.sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    ),
    clients.dynamodb.send(
      new DescribeTableCommand({
        TableName: tableName,
      }),
    ),
  ]);

  if (table.Table?.TableStatus !== "ACTIVE") {
    throw new Error(`Order records table is not active: ${table.Table?.TableStatus}`);
  }
};
