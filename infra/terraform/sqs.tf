resource "aws_sqs_queue" "order_processing" {
  name = "outagegym-${var.incident_id}-order-processing"

  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 10
  message_retention_seconds  = 86400
}
