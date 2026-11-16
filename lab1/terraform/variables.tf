variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "budget_email" {
  description = "Email for AWS budget notifications"
  type        = string
  sensitive   = true
}

variable "budget_limit_usd" {
  description = "Monthly AWS budget limit in USD"
  type        = string
  default     = "10"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "lamp-store"
}

variable "image_tag" {
  description = "Docker image tag used by ECS"
  type        = string
  default     = "bootstrap"
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