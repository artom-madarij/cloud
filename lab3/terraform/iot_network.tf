# Security group for IoT Lambda
resource "aws_security_group" "iot_lambda" {
  name        = "${var.project_name}-iot-lambda-sg"
  description = "Security group for IoT Lambda functions"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow outbound traffic"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-iot-lambda-sg"
  }
}

# Security group for IoT RDS
resource "aws_security_group" "iot_rds" {
  name        = "${var.project_name}-iot-rds-sg"
  description = "MySQL access from IoT Lambda only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from IoT Lambda"
    protocol        = "tcp"
    from_port       = 3306
    to_port         = 3306
    security_groups = [aws_security_group.iot_lambda.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-iot-rds-sg"
  }
}

# Security group for Secrets Manager endpoint
resource "aws_security_group" "iot_secrets_endpoint" {
  name        = "${var.project_name}-iot-secrets-endpoint-sg"
  description = "HTTPS from IoT Lambda to Secrets Manager"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTPS from IoT Lambda"
    protocol        = "tcp"
    from_port       = 443
    to_port         = 443
    security_groups = [aws_security_group.iot_lambda.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-iot-secrets-endpoint-sg"
  }
}

# Private Secrets Manager endpoint
resource "aws_vpc_endpoint" "iot_secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.db_private_a.id]
  security_group_ids  = [aws_security_group.iot_secrets_endpoint.id]
  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-iot-secretsmanager"
  }
}
