resource "aws_sqs_queue" "orders" {
  name                       = "outagegym-terraform-orders"
  visibility_timeout_seconds = 5
}

resource "aws_dynamodb_table" "idempotency" {
  name         = "outagegym-terraform-idempotency"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "idempotencyKey"

  attribute {
    name = "idempotencyKey"
    type = "S"
  }
}
