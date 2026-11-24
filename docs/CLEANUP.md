# Завершення роботи та контроль витрат

Після завершення демонстрації зупини емулятор (`Ctrl+C`) та виконай `./scripts/destroy.sh`.

Terraform видаляє лише ресурси, описані в `terraform/` і відстежувані окремим Terraform state лабораторної роботи 3 (`terraform/terraform.tfstate`). Цей state не повинен використовуватися для керування ресурсами Lab 1 або Lab 2. Він не повинен керувати ресурсами Lab 1/2.

RDS налаштована з `skip_final_snapshot = true`; після destroy дані бази втрачаються. Локальні файли, GitHub та папка доказів не видаляються.

Після destroy перевір у AWS Console регіон `eu-central-1`: RDS, Lambda, API Gateway, SQS та DLQ, таблицю DynamoDB, S3-бакет `lamp-store-lab3-iot-images-*`, VPC Endpoints, VPC, підмережі та Security Groups. У цій конфігурації Lab 3 NAT Gateway, ECS та ALB не створюються. Також перевір, що RDS та Interface VPC Endpoint цієї Lab 3 більше не існують.
