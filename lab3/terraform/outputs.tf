output "lab3_vpc_id" {
  description = "VPC dedicated to Lab 3"
  value       = aws_vpc.main.id
}

output "rds_endpoint" {
  description = "Private RDS endpoint"
  value       = aws_db_instance.mysql.address
}

output "iot_region" {
  description = "AWS region used by Lab 3"
  value       = var.aws_region
}
