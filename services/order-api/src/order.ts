export interface OrderMessage {
  schemaVersion: 1;
  orderId: string;
  correlationId: string;
  acceptedAt: string;
}

export interface CreateOrderResponse {
  orderId: string;
  correlationId: string;
  status: "accepted";
}
