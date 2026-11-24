# Gateway endpoint: Lambda in private subnet (no NAT) can reach DynamoDB
resource "aws_vpc_endpoint" "iot_dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.db_private.id]

  tags = {
    Name = "${var.project_name}-iot-dynamodb"
  }
}

resource "aws_iam_role_policy" "iot_processor_dynamodb" {
  name = "${var.project_name}-iot-processor-dynamodb"
  role = aws_iam_role.iot_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem"]
      Resource = aws_dynamodb_table.iot_measurements.arn
    }]
  })
}

resource "aws_iam_role_policy" "iot_history_bonus" {
  name = "${var.project_name}-iot-history-bonus"
  role = aws_iam_role.iot_history.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Query"]
        Resource = aws_dynamodb_table.iot_measurements.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.iot_images.arn}/images/*"
      }
    ]
  })
}

# Upload-URL Lambda
resource "aws_iam_role" "iot_upload_url" {
  name = "${var.project_name}-iot-upload-url-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "iot_upload_url_logs" {
  role       = aws_iam_role.iot_upload_url.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "iot_upload_url_s3" {
  name = "${var.project_name}-iot-upload-url-s3"
  role = aws_iam_role.iot_upload_url.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "${aws_s3_bucket.iot_images.arn}/images/*"
    }]
  })
}

resource "aws_cloudwatch_log_group" "iot_upload_url" {
  name              = "/aws/lambda/${var.project_name}-iot-upload-url"
  retention_in_days = 7
}

data "archive_file" "iot_upload_url" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/upload-url"
  output_path = "${path.module}/.terraform/iot-upload-url.zip"
}

resource "aws_lambda_function" "iot_upload_url" {
  function_name    = "${var.project_name}-iot-upload-url"
  role             = aws_iam_role.iot_upload_url.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.iot_upload_url.output_path
  source_code_hash = data.archive_file.iot_upload_url.output_base64sha256
  memory_size      = 256
  timeout          = 10

  environment {
    variables = {
      API_KEY        = var.ingest_api_key
      IMAGES_BUCKET  = aws_s3_bucket.iot_images.bucket
      URL_EXPIRATION = tostring(var.camera_presigned_url_expiration)
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.iot_upload_url_logs,
    aws_iam_role_policy.iot_upload_url_s3,
    aws_cloudwatch_log_group.iot_upload_url
  ]

  tags = {
    Name = "${var.project_name}-iot-upload-url"
  }
}

resource "aws_apigatewayv2_integration" "iot_upload_url" {
  api_id                 = aws_apigatewayv2_api.iot_ingest.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.iot_upload_url.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "iot_upload_url" {
  api_id    = aws_apigatewayv2_api.iot_ingest.id
  route_key = "POST /camera/upload-url"
  target    = "integrations/${aws_apigatewayv2_integration.iot_upload_url.id}"
}

resource "aws_lambda_permission" "iot_upload_url_api" {
  statement_id  = "AllowAPIGatewayInvokeUploadUrl"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.iot_upload_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.iot_ingest.execution_arn}/*/*"
}

output "iot_upload_url_endpoint" {
  value = "${aws_apigatewayv2_api.iot_ingest.api_endpoint}/camera/upload-url"
}
