resource "aws_dynamodb_table" "iot_measurements" {
  name         = "${var.project_name}-measurements"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "sensor_id"
  range_key = "measured_at"

  attribute {
    name = "sensor_id"
    type = "S"
  }

  attribute {
    name = "measured_at"
    type = "S"
  }

  tags = {
    Name = "${var.project_name}-measurements"
  }
}
