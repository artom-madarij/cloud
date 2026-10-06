locals {
  ecr_registry = split("/", aws_ecr_repository.app.repository_url)[0]
}

resource "terraform_data" "bootstrap_images" {
  triggers_replace = [
    aws_ecr_repository.app.id,
    aws_ecr_repository.migrations.id,
  ]

  provisioner "local-exec" {
    working_dir = "${path.module}/.."
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      aws ecr get-login-password --region ${var.aws_region} \
        | docker login --username AWS --password-stdin ${local.ecr_registry}
      docker buildx build --platform linux/arm64 -f Dockerfile \
        -t ${aws_ecr_repository.app.repository_url}:${var.image_tag} --push .
      docker buildx build --platform linux/arm64 -f migration.Dockerfile \
        -t ${aws_ecr_repository.migrations.repository_url}:migration --push .
    EOT
  }
}

resource "terraform_data" "run_migration" {
  triggers_replace = [aws_db_instance.mysql.id]

  depends_on = [
    terraform_data.bootstrap_images,
    aws_ecs_task_definition.migration,
    aws_nat_gateway.main,
    aws_route.app_private_nat,
    aws_iam_role_policy.ecs_secrets,
    aws_iam_role_policy_attachment.ecs_execution,
  ]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      TASK_ARN=$(aws ecs run-task --region ${var.aws_region} \
        --cluster ${aws_ecs_cluster.app.name} --launch-type FARGATE \
        --task-definition ${aws_ecs_task_definition.migration.arn} \
        --network-configuration 'awsvpcConfiguration={subnets=[${aws_subnet.app_private_a.id}],securityGroups=[${aws_security_group.ecs.id}],assignPublicIp=DISABLED}' \
        --query 'tasks[0].taskArn' --output text)
      aws ecs wait tasks-stopped --region ${var.aws_region} \
        --cluster ${aws_ecs_cluster.app.name} --tasks "$TASK_ARN"
      CODE=$(aws ecs describe-tasks --region ${var.aws_region} \
        --cluster ${aws_ecs_cluster.app.name} --tasks "$TASK_ARN" \
        --query 'tasks[0].containers[0].exitCode' --output text)
      [ "$CODE" = "0" ] || { echo "Migration failed, exit code: $CODE"; exit 1; }
    EOT
  }
}