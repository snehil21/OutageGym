resource "aws_dynamodb_table" "orders" {
  name         = "outagegym-inc-001-orders"
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
