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
