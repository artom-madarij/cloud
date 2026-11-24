resource "aws_sqs_queue" "iot_measurements_dlq" {
  name                      = "${var.project_name}-measurements-dlq"
  message_retention_seconds = 1209600

  tags = {
    Name = "${var.project_name}-measurements-dlq"
  }
}

resource "aws_sqs_queue_redrive_policy" "iot_measurements" {
  queue_url = aws_sqs_queue.iot_measurements.url

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.iot_measurements_dlq.arn
    maxReceiveCount     = 3
  })
}
