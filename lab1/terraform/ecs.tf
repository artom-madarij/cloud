# ECS Cluster

resource "aws_ecs_cluster" "app" {
  name = "${var.project_name}-cluster"

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# ECS Task Definition

resource "aws_ecs_task_definition" "app" {
  family = "${var.project_name}-task"

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
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      essential = true

      mountPoints    = []
      systemControls = []
      volumesFrom    = []

      portMappings = [
        {
          containerPort = 5002
          hostPort      = 5002
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT", value = "5002" },
        { name = "DB_HOST", value = aws_db_instance.mysql.address },
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
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task"
  }
}

# ECS Service

resource "aws_ecs_service" "app" {
  name = "${var.project_name}-service"

  cluster = aws_ecs_cluster.app.id

  task_definition = aws_ecs_task_definition.app.arn

  launch_type = "FARGATE"

  platform_version = "1.4.0"

  desired_count = 1

  health_check_grace_period_seconds = 60

  network_configuration {
    subnets = [
      aws_subnet.app_private_a.id,
      aws_subnet.app_private_b.id
    ]

    security_groups = [
      aws_security_group.ecs.id
    ]

    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn

    container_name = "app"
    container_port = 5002
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_lb_listener.http,
    terraform_data.bootstrap_images,
    terraform_data.run_migration,
  ]

  tags = {
    Name = "${var.project_name}-service"
  }

  lifecycle {
    ignore_changes = [
      task_definition
    ]
  }
}