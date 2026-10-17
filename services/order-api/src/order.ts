export interface CreateOrderRequest {
  productId: string;
  quantity: number;
}

export interface OrderMessage {
  schemaVersion: 1;
  orderId: string;
  correlationId: string;
  acceptedAt: string;
  productId: string;
  quantity: number;
}

export interface CreateOrderResponse {
  orderId: string;
  correlationId: string;
  status: "accepted";
}
