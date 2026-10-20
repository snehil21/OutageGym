import {
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  GetQueueAttributesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import type { NotificationWorkerConfig } from "./config.js";

export const createAwsClients = (config: NotificationWorkerConfig) => {
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

export const checkReady = async (
  sqs: SQSClient,
  dynamodb: DynamoDBClient,
  queueUrl: string,
  tableName: string,
): Promise<void> => {
  const [, table] = await Promise.all([
    sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    ),
    dynamodb.send(new DescribeTableCommand({ TableName: tableName })),
  ]);
  if (table.Table?.TableStatus !== "ACTIVE") {
    throw new Error("Notification records table is not active");
  }
};

export const readQueueDepth = async (
  sqs: SQSClient,
  queueUrl: string,
): Promise<number> => {
  const result = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages"],
    }),
  );
  return Number(result.Attributes?.ApproximateNumberOfMessages ?? "0");
};
