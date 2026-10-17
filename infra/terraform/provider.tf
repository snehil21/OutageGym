provider "aws" {
  region = "us-east-1"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true

  endpoints {
    dynamodb = "http://floci:4566"
    sqs      = "http://floci:4566"
  }
}
