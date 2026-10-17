import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

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
