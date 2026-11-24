resource "aws_sqs_queue" "iot_measurements" {
  name                       = "${var.project_name}-iot-measurements"
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 210

  tags = {
    Name = "${var.project_name}-iot-measurements"
  }
}

resource "aws_iam_role" "iot_ingest" {
  name = "${var.project_name}-iot-ingest-role"

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
    Name = "${var.project_name}-iot-ingest-role"
  }
}

resource "aws_iam_role_policy_attachment" "iot_ingest_logs" {
  role       = aws_iam_role.iot_ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "iot_ingest_sqs" {
  name = "${var.project_name}-iot-ingest-sqs-policy"
  role = aws_iam_role.iot_ingest.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.iot_measurements.arn
      }
    ]
  })
}

data "archive_file" "iot_ingest" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/ingest"
  output_path = "${path.module}/.terraform/iot-ingest.zip"
}

resource "aws_cloudwatch_log_group" "iot_ingest" {
  name              = "/aws/lambda/${var.project_name}-iot-ingest"
  retention_in_days = 7
}

resource "aws_lambda_function" "iot_ingest" {
  function_name = "${var.project_name}-iot-ingest"
  role          = aws_iam_role.iot_ingest.arn

  runtime = "nodejs22.x"
  handler = "index.handler"

  filename         = data.archive_file.iot_ingest.output_path
  source_code_hash = data.archive_file.iot_ingest.output_base64sha256

  memory_size = 128
  timeout     = 10

  environment {
    variables = {
      API_KEY       = var.ingest_api_key
      SQS_QUEUE_URL = aws_sqs_queue.iot_measurements.url
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.iot_ingest_logs,
    aws_iam_role_policy.iot_ingest_sqs,
    aws_cloudwatch_log_group.iot_ingest
  ]

  tags = {
    Name = "${var.project_name}-iot-ingest"
  }
}

resource "aws_apigatewayv2_api" "iot_ingest" {
  name          = "${var.project_name}-iot-ingest-api"
  protocol_type = "HTTP"

  tags = {
    Name = "${var.project_name}-iot-ingest-api"
  }
}

resource "aws_apigatewayv2_integration" "iot_ingest" {
  api_id = aws_apigatewayv2_api.iot_ingest.id

  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.iot_ingest.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

resource "aws_apigatewayv2_route" "iot_ingest" {
  api_id = aws_apigatewayv2_api.iot_ingest.id

  route_key = "POST /measurements"
  target    = "integrations/${aws_apigatewayv2_integration.iot_ingest.id}"
}

resource "aws_apigatewayv2_stage" "iot_ingest_default" {
  api_id = aws_apigatewayv2_api.iot_ingest.id

  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "iot_ingest_api" {
  statement_id  = "AllowExecutionFromIoTApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.iot_ingest.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.iot_ingest.execution_arn}/*/*"
}