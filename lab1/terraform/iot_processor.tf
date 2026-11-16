# Processor Lambda execution role
resource "aws_iam_role" "iot_processor" {
  name = "${var.project_name}-iot-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"

      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Basic logging permissions
resource "aws_iam_role_policy_attachment" "iot_processor_logs" {
  role = aws_iam_role.iot_processor.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC network interface permissions
resource "aws_iam_role_policy_attachment" "iot_processor_vpc" {
  role = aws_iam_role.iot_processor.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Read RDS master secret
resource "aws_iam_role_policy" "iot_processor_secrets" {
  name = "${var.project_name}-iot-processor-secrets"
  role = aws_iam_role.iot_processor.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Action = [
        "secretsmanager:GetSecretValue"
      ]

      Resource = aws_db_instance.mysql.master_user_secret[0].secret_arn
    }]
  })
}

# Lambda logs
resource "aws_cloudwatch_log_group" "iot_processor" {
  name              = "/aws/lambda/${var.project_name}-iot-processor"
  retention_in_days = 7
}

# Package Processor
data "archive_file" "iot_processor" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/processor"
  output_path = "${path.module}/.terraform/iot-processor.zip"
}

# Processor Lambda
resource "aws_lambda_function" "iot_processor" {
  function_name = "${var.project_name}-iot-processor"

  role    = aws_iam_role.iot_processor.arn
  runtime = "nodejs22.x"
  handler = "index.handler"

  filename         = data.archive_file.iot_processor.output_path
  source_code_hash = data.archive_file.iot_processor.output_base64sha256

  memory_size = 256
  timeout     = 30
  vpc_config {
    subnet_ids = [
      aws_subnet.db_private_a.id
    ]

    security_group_ids = [
      aws_security_group.iot_lambda.id
    ]
  }

  environment {
    variables = {
      DB_SECRET_ARN = aws_db_instance.mysql.master_user_secret[0].secret_arn
      DB_NAME       = "lamp_store"
      DB_HOST       = aws_db_instance.mysql.address
      DB_PORT       = tostring(aws_db_instance.mysql.port)
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.iot_processor_logs,
    aws_iam_role_policy_attachment.iot_processor_vpc,
    aws_iam_role_policy.iot_processor_secrets,
    aws_cloudwatch_log_group.iot_processor,
    aws_vpc_endpoint.iot_secretsmanager
  ]

  tags = {
    Name = "${var.project_name}-iot-processor"
  }
}

# SQS trigger - initially disabled until database test succeeds
resource "aws_lambda_event_source_mapping" "iot_processor_sqs" {
  event_source_arn = aws_sqs_queue.iot_measurements.arn
  function_name    = aws_lambda_function.iot_processor.arn

  batch_size                         = 5
  maximum_batching_window_in_seconds = 5

  function_response_types = [
    "ReportBatchItemFailures"
  ]

  enabled = true

  scaling_config {
    maximum_concurrency = 2
  }
  depends_on = [
    aws_iam_role_policy.iot_processor_sqs
  ]
}


resource "aws_iam_role_policy" "iot_processor_sqs" {
  name = "${var.project_name}-iot-processor-sqs"
  role = aws_iam_role.iot_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.iot_measurements.arn
      }
    ]
  })
}
