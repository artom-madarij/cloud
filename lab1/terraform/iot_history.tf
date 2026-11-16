# IAM role for History Lambda

resource "aws_iam_role" "iot_history" {
  name = "${var.project_name}-iot-history-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-iot-history-role"
  }
}

# CloudWatch logging permissions

resource "aws_iam_role_policy_attachment" "iot_history_logs" {
  role       = aws_iam_role.iot_history.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access permissions

resource "aws_iam_role_policy_attachment" "iot_history_vpc" {
  role       = aws_iam_role.iot_history.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Access to database credentials

resource "aws_iam_role_policy" "iot_history_secrets" {
  name = "${var.project_name}-iot-history-secrets"
  role = aws_iam_role.iot_history.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_db_instance.mysql.master_user_secret[0].secret_arn
      }
    ]
  })
}

# CloudWatch Log Group

resource "aws_cloudwatch_log_group" "iot_history" {
  name              = "/aws/lambda/${var.project_name}-iot-history"
  retention_in_days = 7
}

# Package History Lambda

data "archive_file" "iot_history" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/history"
  output_path = "${path.module}/.terraform/iot-history.zip"
}

# History Lambda Function

resource "aws_lambda_function" "iot_history" {
  function_name = "${var.project_name}-iot-history"

  role    = aws_iam_role.iot_history.arn
  runtime = "nodejs22.x"
  handler = "index.handler"

  filename         = data.archive_file.iot_history.output_path
  source_code_hash = data.archive_file.iot_history.output_base64sha256

  memory_size = 256
  timeout     = 15

  # Access to private RDS database

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
    aws_iam_role_policy_attachment.iot_history_logs,
    aws_iam_role_policy_attachment.iot_history_vpc,
    aws_iam_role_policy.iot_history_secrets,
    aws_cloudwatch_log_group.iot_history,
    aws_vpc_endpoint.iot_secretsmanager
  ]

  tags = {
    Name = "${var.project_name}-iot-history"
  }
}

# API Gateway integration

resource "aws_apigatewayv2_integration" "iot_history" {
  api_id = aws_apigatewayv2_api.iot_ingest.id

  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.iot_history.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# GET /sensors/{sensor_id}/history

resource "aws_apigatewayv2_route" "iot_history" {
  api_id = aws_apigatewayv2_api.iot_ingest.id

  route_key = "GET /sensors/{sensor_id}/history"
  target    = "integrations/${aws_apigatewayv2_integration.iot_history.id}"
}

# Allow API Gateway to invoke History Lambda

resource "aws_lambda_permission" "iot_history_api" {
  statement_id  = "AllowExecutionFromIoTHistoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.iot_history.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.iot_ingest.execution_arn}/*/GET/sensors/*/history"
}

# Output

output "iot_history_lambda_name" {
  description = "IoT History Lambda function name"
  value       = aws_lambda_function.iot_history.function_name
}

output "iot_history_route" {
  description = "API Gateway route for sensor history"
  value       = "${aws_apigatewayv2_api.iot_ingest.api_endpoint}/sensors/{sensor_id}/history"
}