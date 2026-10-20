export type NotificationChannel = "EMAIL" | "SMS";

export interface CreateOrderRequest {
  productId: string;
  quantity: number;
  notificationChannel?: NotificationChannel;
}

export interface OrderMessage {
  schemaVersion: 1;
  orderId: string;
  correlationId: string;
  idempotencyKey: string;
  acceptedAt: string;
  productId: string;
  quantity: number;
  notificationChannel: NotificationChannel;
}

export interface CreateOrderResponse {
  orderId: string;
  correlationId: string;
  status: "accepted";
}
