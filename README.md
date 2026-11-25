# Лабораторна робота №3 — IoT Serverless Pipeline

**Виконав:** Мадярій Артьом, група ІР-34, ІКТА  
**Проєкт:** Lamp Store — система збору, обробки та збереження вимірювань чотирьох IoT-датчиків.

## Мета та результат

Емулятор температури, вологості, освітленості та камери надсилає вимірювання через HTTP REST API. Lambda-приймач перевіряє API key та схему повідомлення і додає його до Amazon SQS. Lambda Processor отримує повідомлення з черги, визначає аномалії та ідемпотентно записує вимірювання в Amazon RDS MySQL. Окрема Lambda History повертає історію за датчиком і часовим діапазоном.

## Архітектура

```text
IoT Emulator
   | POST /measurements + x-api-key
   v
Amazon API Gateway -> Lambda Ingest -> Amazon SQS
                                        |
                                        v
                                  Lambda Processor
                                        |
                                        v
                                   Amazon RDS MySQL

Client -> API Gateway -> Lambda History -> Amazon RDS MySQL
```

Приймання, обробка та читання виконуються керованими serverless-сервісами. Звичайним локальним процесом є лише емулятор.
Повна схема з бонусними компонентами (DLQ, DynamoDB, S3 і камера) наведена в `docs/ARCHITECTURE.md`.

## Каталоги

- `emulator/` — Node.js емулятор, Dockerfile та конфігурація.
- `functions/ingest/` — HTTP-приймач і публікація в SQS.
- `functions/processor/` — обробка SQS, перевірка діапазонів, ідемпотентний запис.
- `functions/history/` — REST API для історії вимірювань.
- `functions/upload-url/` — видача підписаних URL для завантаження зображень камери в S3.
- `terraform/` — повністю окрема інфраструктура та локальний Terraform state цієї лабораторної.
- `docs/` — звіти за обов'язковими завданнями та інструкції.
- `scripts/` — сценарії розгортання, тестування, запуску та видалення.
- `evidence/` — локальні результати запуску; не додаються до Git.

## AWS ресурси

Використовуються API Gateway HTTP API, чотири AWS Lambda (Ingest, Processor, History та Upload URL для камери), Amazon SQS з чергою недоставлених повідомлень (DLQ), Amazon RDS MySQL, DynamoDB, приватний S3-бакет, Secrets Manager, окрема VPC, дві приватні підмережі, security groups, один Interface VPC Endpoint для Secrets Manager та один Gateway VPC Endpoint для DynamoDB. NAT Gateway та постійно запущені ECS-контейнери для IoT-конвеєра не створюються.

> RDS і Interface VPC Endpoint можуть мати погодинну вартість. Видаляй стек після демонстрації. `terraform destroy` видаляє RDS без фінального snapshot (`skip_final_snapshot = true`), тому дані бази після видалення не зберігаються.

## Передумови

- AWS CLI налаштований (`aws sts get-caller-identity` має працювати).
- Terraform відповідає версії, зазначеній у `terraform/versions.tf`.
- Node.js 22 або новіший.
- Docker потрібен лише для запуску емулятора в контейнері.
- У `emulator/.env` є `API_KEY` довжиною щонайменше 32 символи.

## Перший запуск

1. Створи локальний `.env`:

   ```bash
   cp emulator/.env.example emulator/.env
   ```

2. У `emulator/.env` встанови справжній `API_KEY`. `INGEST_URL` буде оновлено після розгортання.
3. Запусти:

   ```bash
   ./scripts/deploy.sh
   ```

Скрипт встановить залежності Lambda, ініціалізує Terraform, перевірить конфігурацію, створить окрему інфраструктуру та оновить URL приймача в `.env`. На першому запуску буде запитана адреса для AWS Budget.

## Запуск емулятора

```bash
./scripts/run-emulator.sh
```

Для зупинки натисни `Ctrl+C`.

## Тестування API

```bash
./scripts/test-api.sh
```

Приймання: `POST /measurements`.  
Історія: `GET /sensors/{sensor_id}/history?from=...&to=...&limit=...`.

## Видалення інфраструктури

Після завершення демонстрації:

```bash
./scripts/destroy.sh
```

Скрипт запускає `terraform plan -destroy` та `terraform destroy`. Підтверджуй видалення лише після перевірки плану.

## Документація

- `docs/ARCHITECTURE.md` — схема та призначення компонентів.
- `docs/INGEST.md` — схема повідомлення, запит curl та приймання у SQS.
- `docs/PROCESSING.md` — маршрутизація, аномалії, ідемпотентність та помилки.
- `docs/DATA.md` — схема таблиці, індекс та API історії.
- `docs/DEPLOYMENT.md` — повний цикл розгортання.
- `docs/CLEANUP.md` — видалення та контроль ресурсів.
- `docs/DEMO.md` — порядок демонстрації на захисті.

## Бонусні завдання

Завдання 5 (черга недоставлених повідомлень) описане в docs/DLQ.md, завдання 6 (DynamoDB) у docs/NOSQL.md, завдання 7 (S3 і датчик камери) у docs/BLOB.md.

## Публічні адреси API

API Gateway створюється Terraform. Після кожного нового розгортання його ID може змінитися, тому актуальні публічні адреси потрібно отримувати з Terraform outputs (не використовувати застарілий URL, скопійований із попереднього розгортання):

```bash
terraform -chdir=terraform output -raw iot_ingest_url
terraform -chdir=terraform output -raw iot_upload_url_endpoint
terraform -chdir=terraform output -raw iot_history_route
```

Перший output — адреса приймання `POST /measurements`, другий — адреса `POST /camera/upload-url`, третій — шаблон `GET /sensors/{sensor_id}/history`. Для читання історії з DynamoDB додай параметр `source=dynamodb`.

Після успішного запуску `./scripts/deploy.sh` актуальна адреса приймання також автоматично записується в `emulator/.env` як `INGEST_URL`.
