# Завершення роботи та контроль витрат

Після завершення демонстрації зупини емулятор (`Ctrl+C`) та виконай `./scripts/destroy.sh`.

Terraform видаляє лише ресурси, описані в `lab3/terraform/` і відстежувані окремим state Lab 3. Він не повинен керувати ресурсами Lab 1/2.

RDS налаштована з `skip_final_snapshot = true`; після destroy дані бази втрачаються. Локальні файли, GitHub та папка доказів не видаляються.

Після destroy перевір у AWS Console регіон `eu-central-1`: RDS, NAT Gateways, VPC Endpoints, ECS Services та Load Balancers. У цій конфігурації Lab 3 NAT Gateway, ECS та ALB не створюються. Також перевір, що RDS та Interface VPC Endpoint цієї Lab 3 більше не існують.
