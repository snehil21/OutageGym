import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type SQSClient,
} from "@aws-sdk/client-sqs";

import type { ProcessedOrder } from "./message-processor.js";

export interface ConsumedMessage extends ProcessedOrder {
  messageId: string;
  receiveCount: number;
}

export type ProcessMessage = (
  body: string | undefined,
) => Promise<ProcessedOrder>;

export const consumeNextMessage = async (
  sqs: SQSClient,
  queueUrl: string,
  waitTimeSeconds: number,
  processMessage: ProcessMessage,
  abortSignal?: AbortSignal,
): Promise<ConsumedMessage | undefined> => {
  const response = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: waitTimeSeconds,
      MessageSystemAttributeNames: ["ApproximateReceiveCount"],
      MessageAttributeNames: ["All"],
    }),
    abortSignal === undefined ? {} : { abortSignal },
  );

  const message = response.Messages?.[0];

  if (message === undefined) {
    return undefined;
  }

  if (message.MessageId === undefined || message.ReceiptHandle === undefined) {
    throw new Error("Received an SQS message without its required identifiers");
  }

  const processed = await processMessage(message.Body);

  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    }),
  );

  return {
    ...processed,
    messageId: message.MessageId,
    receiveCount: Number(message.Attributes?.ApproximateReceiveCount ?? "1"),
  };
};
