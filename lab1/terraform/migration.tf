# ECR repository for database migrations

resource "aws_ecr_repository" "migrations" {
  name                 = "${var.project_name}/migrations"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-migrations-ecr"
  }
}

# ECS migration task (запускається один раз з bootstrap.tf)

resource "aws_ecs_task_definition" "migration" {
  family = "${var.project_name}-migration"

  requires_compatibilities = [
    "FARGATE"
  ]

  network_mode = "awsvpc"

  cpu    = "256"
  memory = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "migration"
      image     = "${aws_ecr_repository.migrations.repository_url}:migration"
      essential = true

      environment = [
        { name = "DB_HOST", value = aws_db_instance.mysql.address },
        { name = "DB_PORT", value = "3306" },
        { name = "DB_NAME", value = "lamp_store" }
      ]

      secrets = [
        {
          name      = "DB_USER"
          valueFrom = "${aws_db_instance.mysql.master_user_secret[0].secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_db_instance.mysql.master_user_secret[0].secret_arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "migration"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-migration"
  }
}