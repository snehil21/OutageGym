resource "aws_sqs_queue" "order_processing_dead_letter" {
  name = "outagegym-${var.incident_id}-order-processing-dlq"

  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "order_processing" {
  name = "outagegym-${var.incident_id}-order-processing"

  visibility_timeout_seconds = var.order_processing_visibility_timeout_seconds
  receive_wait_time_seconds  = 10
  message_retention_seconds  = 86400

  redrive_policy = var.order_processing_dlq_enabled ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_processing_dead_letter.arn
    maxReceiveCount     = var.order_processing_max_receive_count
  }) : null
}
