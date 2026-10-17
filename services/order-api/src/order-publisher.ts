import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";

import type { OrderMessage } from "./order.js";

export const publishOrder = async (
  sqs: SQSClient,
  queueUrl: string,
  message: OrderMessage,
): Promise<string> => {
  const result = await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        correlationId: {
          DataType: "String",
          StringValue: message.correlationId,
        },
        orderId: {
          DataType: "String",
          StringValue: message.orderId,
        },
      },
    }),
  );

  if (result.MessageId === undefined) {
    throw new Error("SQS accepted the request without returning a message ID");
  }

  return result.MessageId;
};
