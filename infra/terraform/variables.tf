variable "incident_id" {
  description = "Incident identifier used to isolate OutageGym resources."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*$", var.incident_id))
    error_message = "incident_id must contain lowercase letters, numbers, and hyphens."
  }
}
