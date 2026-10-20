resource "aws_dynamodb_table" "order_records" {
  name         = "outagegym-${var.incident_id}-order-records"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"
  range_key    = "recordId"

  attribute {
    name = "orderId"
    type = "S"
  }

  attribute {
    name = "recordId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "checkout_requests" {
  name         = "outagegym-${var.incident_id}-checkout-requests"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "idempotencyKey"

  attribute {
    name = "idempotencyKey"
    type = "S"
  }
}
