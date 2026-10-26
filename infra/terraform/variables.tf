variable "aws_endpoint_url" {
  description = "Local Floci endpoint used by the Terraform AWS provider."
  type        = string

  validation {
    condition     = var.aws_endpoint_url == "http://floci:4566"
    error_message = "aws_endpoint_url must target the local Floci service."
  }
}

variable "incident_id" {
  description = "Incident identifier used to isolate OutageGym resources."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*$", var.incident_id))
    error_message = "incident_id must contain lowercase letters, numbers, and hyphens."
  }
}

variable "order_processing_visibility_timeout_seconds" {
  description = "Visibility timeout for the order-processing queue."
  type        = number

  validation {
    condition = (
      var.order_processing_visibility_timeout_seconds >= 0 &&
      var.order_processing_visibility_timeout_seconds <= 43200
    )
    error_message = "order_processing_visibility_timeout_seconds must be from 0 to 43200."
  }
}

variable "order_processing_dlq_enabled" {
  description = "Whether the order-processing queue moves repeatedly failing messages to its dead-letter queue."
  type        = bool
  default     = false
}

variable "order_processing_max_receive_count" {
  description = "Number of deliveries permitted before SQS moves a message to the dead-letter queue."
  type        = number
  default     = 3

  validation {
    condition = (
      var.order_processing_max_receive_count >= 1 &&
      var.order_processing_max_receive_count <= 1000
    )
    error_message = "order_processing_max_receive_count must be from 1 to 1000."
  }
}
