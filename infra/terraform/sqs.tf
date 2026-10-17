resource "aws_sqs_queue" "orders" {
  name = "outagegym-inc-001-orders"

  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 10
  message_retention_seconds  = 86400
}
