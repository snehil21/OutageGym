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

export interface MessageDelivery {
  messageId: string;
  receiveCount: number;
}

export class MessageProcessingError extends Error {
  readonly messageId: string;
  readonly receiveCount: number;

  constructor(delivery: MessageDelivery, cause: unknown) {
    super("Order message processing failed", { cause });
    this.name = "MessageProcessingError";
    this.messageId = delivery.messageId;
    this.receiveCount = delivery.receiveCount;
  }
}

export type ProcessMessage = (
  body: string | undefined,
  delivery: MessageDelivery,
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

  const delivery = {
    messageId: message.MessageId,
    receiveCount: Number(message.Attributes?.ApproximateReceiveCount ?? "1"),
  };
  let processed: ProcessedOrder;

  try {
    processed = await processMessage(message.Body, delivery);
  } catch (error) {
    throw new MessageProcessingError(delivery, error);
  }

  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    }),
  );

  return {
    ...processed,
    ...delivery,
  };
};
