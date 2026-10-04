output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id
  ]
}

output "app_private_subnet_ids" {
  value = [
    aws_subnet.app_private_a.id,
    aws_subnet.app_private_b.id
  ]
}

output "db_private_subnet_ids" {
  value = [
    aws_subnet.db_private_a.id,
    aws_subnet.db_private_b.id
  ]
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "rds_endpoint" {
  value = aws_db_instance.mysql.address
}

output "rds_port" {
  value = aws_db_instance.mysql.port
}

output "rds_secret_arn" {
  value     = aws_db_instance.mysql.master_user_secret[0].secret_arn
  sensitive = true
}

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "ecs_task_definition" {
  value = aws_ecs_task_definition.app.family
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.app.name
}

output "migration_repository_url" {
  value = aws_ecr_repository.migrations.repository_url
}

output "migration_task_definition" {
  value = aws_ecs_task_definition.migration.family
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}