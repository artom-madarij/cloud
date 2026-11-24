# Основна демонстрація

1. Показати структуру `emulator/`, `.env.example`, Dockerfile та конфігурацію чотирьох датчиків.
2. Запустити емулятор і показати лічильники успішних відправлень та помилок.
3. Показати POST `/measurements` і відповідь `202 Accepted`.
4. Показати CloudWatch Logs Lambda Ingest та Lambda Processor, продемонструвати обробку повідомлень різних типів.
5. Показати таблицю `measurements` у RDS MySQL та унікальний індекс `(sensor_id, measured_at)`.
6. Виконати GET `/sensors/{sensor_id}/history` і показати `200 OK` із вимірюваннями у зворотному хронологічному порядку.
7. Пояснити ідемпотентність через `ON DUPLICATE KEY UPDATE` та обробку часткових помилок через `ReportBatchItemFailures`.

Бонусні завдання

8. Бонус 5 (DLQ): показати помилку `Invalid measurement unit` у CloudWatch Logs Lambda Processor та повідомлення в `lamp-store-lab3-measurements-dlq`. Пояснити `maxReceiveCount = 3`.
9. Бонус 6 (DynamoDB): виконати GET історії з `source=dynamodb` та порівняти відповідь із MySQL.
10. Бонус 7 (камера): показати рядки `[SENT] camera-01` у журналі емулятора, файли в S3 через `aws s3 ls`, а також історію `camera-01` з полем `image_url`. Відкрити підписаний URL у браузері.

Завершення

11. Зупинити емулятор через `Ctrl+C`.
12. Видалити інфраструктуру командою `./scripts/destroy.sh`.
13. Переконатися, що ресурси Lab 3 видалені з AWS у регіоні `eu-central-1`.