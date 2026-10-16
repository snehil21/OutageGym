import {
  ListQueuesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import {
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

const expectedEndpoint = "http://floci:4566";
const expectedAccessKeyId = "outagegym-local";
const expectedSecretAccessKey = "outagegym-local-only";

if (process.env.AWS_ENDPOINT_URL !== expectedEndpoint) {
  throw new Error(`Refusing non-local AWS endpoint: ${process.env.AWS_ENDPOINT_URL}`);
}

if (
  process.env.AWS_ACCESS_KEY_ID !== expectedAccessKeyId ||
  process.env.AWS_SECRET_ACCESS_KEY !== expectedSecretAccessKey
) {
  throw new Error("Refusing credentials other than the OutageGym local credentials");
}

const clientConfig = {
  endpoint: expectedEndpoint,
  region: process.env.AWS_REGION ?? "us-east-1",
};

const sqs = new SQSClient(clientConfig);
const dynamodb = new DynamoDBClient(clientConfig);

const [queueResult, tableResult] = await Promise.all([
  sqs.send(new ListQueuesCommand({})),
  dynamodb.send(new ListTablesCommand({})),
]);

console.log(
  JSON.stringify(
    {
      endpoint: expectedEndpoint,
      queues: queueResult.QueueUrls ?? [],
      tables: tableResult.TableNames ?? [],
    },
    null,
    2,
  ),
);
