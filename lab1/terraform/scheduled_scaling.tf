# ECS Scheduled Scaling

resource "aws_appautoscaling_scheduled_action" "daytime" {
  name               = "${var.project_name}-daytime"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension

  schedule = "cron(0 8 * * ? *)"
  timezone = "Europe/Kyiv"

  scalable_target_action {
    min_capacity = 2
    max_capacity = 3
  }
}

resource "aws_appautoscaling_scheduled_action" "nighttime" {
  name               = "${var.project_name}-nighttime"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension

  schedule = "cron(0 22 * * ? *)"
  timezone = "Europe/Kyiv"

  scalable_target_action {
    min_capacity = 1
    max_capacity = 3
  }
}