import { SQSClient } from "@aws-sdk/client-sqs";

import type { AppConfig } from "./config.js";

type SqsConfig = Pick<AppConfig, "awsEndpointUrl" | "awsRegion">;

export const createSqsClient = (config: SqsConfig): SQSClient =>
  new SQSClient({
    endpoint: config.awsEndpointUrl,
    region: config.awsRegion,
    credentials: {
      accessKeyId: "outagegym-local",
      secretAccessKey: "outagegym-local-only",
    },
  });
