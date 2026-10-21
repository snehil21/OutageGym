import { GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { createLocalAwsCredentials } from "@outagegym/service-core";

import type { AppConfig } from "./config.js";

type SqsConfig = Pick<AppConfig, "awsEndpointUrl" | "awsRegion">;

export const createSqsClient = (config: SqsConfig): SQSClient =>
  new SQSClient({
    endpoint: config.awsEndpointUrl,
    region: config.awsRegion,
    credentials: createLocalAwsCredentials(),
  });

export const checkQueueReady = async (
  sqs: SQSClient,
  queueUrl: string,
): Promise<void> => {
  await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["QueueArn"],
    }),
  );
};
