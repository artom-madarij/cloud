output "iot_dlq_url" {
  value = aws_sqs_queue.iot_measurements_dlq.url
}

output "iot_dynamodb_table_name" {
  value = aws_dynamodb_table.iot_measurements.name
}

output "iot_images_bucket" {
  value = aws_s3_bucket.iot_images.bucket
}
