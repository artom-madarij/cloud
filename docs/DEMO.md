# Сценарій демонстрації на захисті

1. Показати `emulator/` та конфігурацію трьох датчиків.
2. Запустити емулятор і показати лічильники успішних надсилань та помилок.
3. Показати POST `/measurements` і відповідь `202 Accepted`.
4. Показати повідомлення в CloudWatch Logs Lambda Ingest.
5. Показати CloudWatch Logs Lambda Processor та обробку трьох типів датчиків.
6. Показати таблицю `measurements` і унікальний індекс `(sensor_id, measured_at)`.
7. Виконати GET `/sensors/{sensor_id}/history` та показати `200 OK` із вимірюваннями у зворотному хронологічному порядку.
8. Пояснити, як працює `ON DUPLICATE KEY UPDATE` і `ReportBatchItemFailures`.
9. Після демонстрації зупинити емулятор та видалити ресурси командою `./scripts/destroy.sh`.
