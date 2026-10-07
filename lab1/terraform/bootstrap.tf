locals {
  ecr_registry = split("/", aws_ecr_repository.app.repository_url)[0]
}

resource "terraform_data" "bootstrap_images" {
  triggers_replace = [
    aws_ecr_repository.app.id,
    aws_ecr_repository.migrations.id,
    filesha256("${path.module}/../Dockerfile"),
    filesha256("${path.module}/../migration.Dockerfile"),
    filesha256("${path.module}/../migrate.sh")
  ]

  depends_on = [
    aws_ecr_repository.app,
    aws_ecr_repository.migrations
  ]

  provisioner "local-exec" {
    working_dir = "${path.module}/.."
    interpreter = ["/bin/bash", "-c"]

    command = <<-EOT
      set -euo pipefail

      AWS_REGION="${var.aws_region}"
      ECR_REGISTRY="${local.ecr_registry}"

      echo "Logging in to Amazon ECR..."

      aws ecr get-login-password \
        --region "$AWS_REGION" |
        docker login \
          --username AWS \
          --password-stdin "$ECR_REGISTRY"

      echo "Checking app bootstrap image..."

      if aws ecr describe-images \
        --repository-name "${aws_ecr_repository.app.name}" \
        --image-ids imageTag="${var.image_tag}" \
        --region "$AWS_REGION" \
        >/dev/null 2>&1
      then
        echo "App bootstrap image already exists."
      else
        echo "App bootstrap image does not exist. Building..."

        docker buildx build \
          --platform linux/arm64 \
          --file Dockerfile \
          --tag "${aws_ecr_repository.app.repository_url}:${var.image_tag}" \
          --push \
          .

        echo "App bootstrap image pushed successfully."
      fi

      echo "Checking migration image..."

      if aws ecr describe-images \
        --repository-name "${aws_ecr_repository.migrations.name}" \
        --image-ids imageTag=migration \
        --region "$AWS_REGION" \
        >/dev/null 2>&1
      then
        echo "Migration image already exists."
      else
        echo "Migration image does not exist. Building..."

        docker buildx build \
          --platform linux/arm64 \
          --file migration.Dockerfile \
          --tag "${aws_ecr_repository.migrations.repository_url}:migration" \
          --push \
          .

        echo "Migration image pushed successfully."
      fi

      echo "Bootstrap completed successfully."
    EOT
  }
}

resource "terraform_data" "run_migration" {
  triggers_replace = [
    aws_db_instance.mysql.id
  ]

  depends_on = [
    terraform_data.bootstrap_images,
    aws_ecs_task_definition.migration,
    aws_nat_gateway.main,
    aws_route.app_private_nat,
    aws_iam_role_policy.ecs_secrets,
    aws_iam_role_policy_attachment.ecs_execution
  ]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]

    command = <<-EOT
      set -euo pipefail

      AWS_REGION="${var.aws_region}"
      CLUSTER="${aws_ecs_cluster.app.name}"
      TASK_DEFINITION="${aws_ecs_task_definition.migration.arn}"

      echo "Starting database migration task..."

      TASK_ARN=$(aws ecs run-task \
        --region "$AWS_REGION" \
        --cluster "$CLUSTER" \
        --launch-type FARGATE \
        --platform-version 1.4.0 \
        --task-definition "$TASK_DEFINITION" \
        --network-configuration "awsvpcConfiguration={subnets=[${aws_subnet.app_private_a.id}],securityGroups=[${aws_security_group.ecs.id}],assignPublicIp=DISABLED}" \
        --query 'tasks[0].taskArn' \
        --output text)

      if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
        echo "ERROR: Migration task was not started."
        exit 1
      fi

      echo "Migration task started:"
      echo "$TASK_ARN"

      echo "Waiting for migration task to stop..."

      aws ecs wait tasks-stopped \
        --region "$AWS_REGION" \
        --cluster "$CLUSTER" \
        --tasks "$TASK_ARN"

      EXIT_CODE=$(aws ecs describe-tasks \
        --region "$AWS_REGION" \
        --cluster "$CLUSTER" \
        --tasks "$TASK_ARN" \
        --query 'tasks[0].containers[?name==`migration`].exitCode | [0]' \
        --output text)

      STOPPED_REASON=$(aws ecs describe-tasks \
        --region "$AWS_REGION" \
        --cluster "$CLUSTER" \
        --tasks "$TASK_ARN" \
        --query 'tasks[0].stoppedReason' \
        --output text)

      echo "Migration exit code: $EXIT_CODE"
      echo "Migration stopped reason: $STOPPED_REASON"

      if [ "$EXIT_CODE" != "0" ]; then
        echo "ERROR: Database migration failed."
        exit 1
      fi

      echo "Database migration completed successfully."
    EOT
  }
}
