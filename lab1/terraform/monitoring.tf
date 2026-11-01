# SNS topic for CloudWatch alerts

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.budget_email
}

# CloudWatch Dashboard

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6

        properties = {
          title  = "ECS Tasks: Desired vs Running"
          region = var.aws_region
          period = 60
          stat   = "Average"

          metrics = [
            [
              "ECS/ContainerInsights",
              "DesiredTaskCount",
              "ClusterName",
              aws_ecs_cluster.app.name,
              "ServiceName",
              aws_ecs_service.app.name,
              { label = "Desired tasks" }
            ],
            [
              "ECS/ContainerInsights",
              "RunningTaskCount",
              "ClusterName",
              aws_ecs_cluster.app.name,
              "ServiceName",
              aws_ecs_service.app.name,
              { label = "Running tasks" }
            ]
          ]
        }
      },

      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          title  = "ECS CPU Utilization"
          region = var.aws_region
          period = 60
          stat   = "Average"

          metrics = [
            [
              "AWS/ECS",
              "CPUUtilization",
              "ClusterName",
              aws_ecs_cluster.app.name,
              "ServiceName",
              aws_ecs_service.app.name
            ]
          ]
        }
      },

      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          title  = "ALB Requests per Minute"
          region = var.aws_region
          period = 60
          stat   = "Sum"

          metrics = [
            [
              "AWS/ApplicationELB",
              "RequestCount",
              "LoadBalancer",
              aws_lb.app.arn_suffix
            ]
          ]
        }
      },

      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          title  = "ALB Response Time p95"
          region = var.aws_region
          period = 60
          stat   = "p95"

          metrics = [
            [
              "AWS/ApplicationELB",
              "TargetResponseTime",
              "LoadBalancer",
              aws_lb.app.arn_suffix
            ]
          ]
        }
      },

      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6

        properties = {
          title  = "ALB HTTP 5xx Errors"
          region = var.aws_region
          period = 60
          stat   = "Sum"

          metrics = [
            [
              "AWS/ApplicationELB",
              "HTTPCode_Target_5XX_Count",
              "LoadBalancer",
              aws_lb.app.arn_suffix
            ]
          ]
        }
      }
    ]
  })
}

# Alarm for HTTP 5xx errors

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name = "${var.project_name}-alb-5xx"

  alarm_description = "Alarm when the application returns HTTP 5xx errors"

  namespace   = "AWS/ApplicationELB"
  metric_name = "HTTPCode_Target_5XX_Count"

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }

  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"

  treat_missing_data = "notBreaching"

  alarm_actions = [
    aws_sns_topic.alerts.arn
  ]
}
# Alarm when ECS reaches maximum task count

resource "aws_cloudwatch_metric_alarm" "ecs_max_tasks" {
  alarm_name        = "${var.project_name}-ecs-max-tasks"
  alarm_description = "Alarm when ECS reaches maximum capacity of 3 tasks"

  namespace   = "ECS/ContainerInsights"
  metric_name = "DesiredTaskCount"

  dimensions = {
    ClusterName = aws_ecs_cluster.app.name
    ServiceName = aws_ecs_service.app.name
  }

  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 3
  comparison_operator = "GreaterThanOrEqualToThreshold"

  treat_missing_data = "notBreaching"

  alarm_actions = [
    aws_sns_topic.alerts.arn
  ]

  ok_actions = [
    aws_sns_topic.alerts.arn
  ]
}
