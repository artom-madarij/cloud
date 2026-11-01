# Private DNS namespace for internal services

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name        = "${var.project_name}.internal"
  description = "Private service discovery namespace for ${var.project_name}"
  vpc         = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-internal"
  }
}

# Redis service discovery

resource "aws_service_discovery_service" "redis" {
  name = "redis"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

}

# Redis CloudWatch logs

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/ecs/${var.project_name}-redis"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-redis-logs"
  }
}

# Redis ECS Task Definition

resource "aws_ecs_task_definition" "redis" {
  family = "${var.project_name}-redis-task"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  cpu    = "256"
  memory = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "redis"
      image     = "redis:7-alpine"
      essential = true

      portMappings = [
        {
          containerPort = 6379
          hostPort      = 6379
          protocol      = "tcp"
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "redis-cli ping | grep -q PONG"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.redis.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "redis"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-redis-task"
  }
}

# Redis ECS Service

resource "aws_ecs_service" "redis" {
  name            = "${var.project_name}-redis-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.redis.arn

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  desired_count = 1

  # Keep only one Redis instance during deployment.
  # Redis is a single shared cache, not a Redis cluster.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  network_configuration {
    subnets = [
      aws_subnet.app_private_a.id,
      aws_subnet.app_private_b.id
    ]

    security_groups = [
      aws_security_group.redis.id
    ]

    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.redis.arn
  }

  depends_on = [
    aws_cloudwatch_log_group.redis
  ]

  tags = {
    Name = "${var.project_name}-redis-service"
  }
}
