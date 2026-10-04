# RDS subnet group

resource "aws_db_subnet_group" "mysql" {
  name = "${var.project_name}-db-subnet-group"

  subnet_ids = [
    aws_subnet.db_private_a.id,
    aws_subnet.db_private_b.id
  ]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS MySQL

resource "aws_db_instance" "mysql" {
  identifier = "${var.project_name}-mysql"

  engine         = "mysql"
  engine_version = "8.4.11"

  instance_class        = "db.t4g.micro"
  allocated_storage     = 20
  max_allocated_storage = 20
  storage_type          = "gp3"

  db_name  = "lamp_store"
  username = "lamp_admin"

  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.mysql.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false

  multi_az = false

  storage_encrypted = true

  backup_retention_period = 0

  deletion_protection = false
  skip_final_snapshot = true

  auto_minor_version_upgrade = false

  apply_immediately = true

  tags = {
    Name = "${var.project_name}-mysql"
  }
}