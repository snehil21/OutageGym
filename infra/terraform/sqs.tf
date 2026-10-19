resource "aws_sqs_queue" "order_processing" {
  name = "outagegym-${var.incident_id}-order-processing"

  visibility_timeout_seconds = var.order_processing_visibility_timeout_seconds
  receive_wait_time_seconds  = 10
  message_retention_seconds  = 86400
}
