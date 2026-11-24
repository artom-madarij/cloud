variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Unique project name for the isolated Lab 3 stack"
  type        = string
  default     = "lamp-store-lab3"
}

variable "ingest_api_key" {
  description = "API key used by the IoT measurement receiver"
  type        = string
  sensitive   = true
  nullable    = false

  validation {
    condition     = length(var.ingest_api_key) >= 32
    error_message = "The ingest API key must contain at least 32 characters."
  }
}

variable "budget_email" {
  description = "Email for AWS budget notifications"
  type        = string
}

variable "budget_limit_usd" {
  description = "Monthly AWS budget limit in USD"
  type        = string
  default     = "10"
}

variable "camera_presigned_url_expiration" {
  description = "Presigned URL expiration in seconds"
  type        = number
  default     = 300

  validation {
    condition     = var.camera_presigned_url_expiration >= 60 && var.camera_presigned_url_expiration <= 3600
    error_message = "Expiration must be between 60 and 3600 seconds."
  }
}
