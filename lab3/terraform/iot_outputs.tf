output "iot_ingest_url" {
  description = "Public URL for sending IoT measurements"
  value       = "${aws_apigatewayv2_api.iot_ingest.api_endpoint}/measurements"
}

output "iot_sqs_queue_url" {
  description = "SQS queue URL for IoT measurements"
  value       = aws_sqs_queue.iot_measurements.url
}

output "iot_ingest_lambda_name" {
  description = "IoT ingest Lambda function name"
  value       = aws_lambda_function.iot_ingest.function_name
}

output "iot_ingest_api_id" {
  description = "IoT HTTP API Gateway ID"
  value       = aws_apigatewayv2_api.iot_ingest.id
}