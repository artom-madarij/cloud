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