data "aws_caller_identity" "bonus" {}

resource "aws_s3_bucket" "iot_images" {
  bucket        = "${var.project_name}-iot-images-${data.aws_caller_identity.bonus.account_id}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-iot-images"
  }
}

resource "aws_s3_bucket_public_access_block" "iot_images" {
  bucket                  = aws_s3_bucket.iot_images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "iot_images" {
  bucket = aws_s3_bucket.iot_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
