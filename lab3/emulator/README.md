# IoT Sensor Emulator

Локальний емулятор трьох датчиків: temperature, humidity та light.

## Налаштування

1. Створи `.env` на основі `.env.example`.
2. Після `terraform apply` запусти `../scripts/deploy.sh` — він оновить `INGEST_URL`.
3. Переконайся, що `API_KEY` у `.env` збігається з `ingest_api_key` Terraform (скрипт бере його з `API_KEY`).

Інтервали кожного датчика задаються через `TEMPERATURE_INTERVAL_MS`, `HUMIDITY_INTERVAL_MS` та `LIGHT_INTERVAL_MS` у межах 20–100 мс.

## Запуск

З каталогу `lab3/` виконай `./scripts/run-emulator.sh` або з `emulator/` — `npm start`.

## Docker

```bash
docker build -t lab3-iot-emulator ./emulator
docker run --rm --env-file ./emulator/.env lab3-iot-emulator
```

Датчик камери

Окрім трьох датчиків з інтервалом 20–100 мс, емулятор має четвертий датчик `camera-01`. Він надсилає знімок розміром до 1 МБ з інтервалом від 10 до 30 секунд. Інтервал задається змінною `CAMERA_INTERVAL_MS` (за замовчуванням 15000).

Для камери емулятор спочатку отримує підписаний URL за адресою `POST /camera/upload-url`, потім завантажує зображення в S3 напряму, і лише після цього надсилає звичайне повідомлення з полем `object_key`. Адреса для отримання URL береться з `INGEST_URL` (шлях `/camera/upload-url`). За потреби її можна задати змінною `UPLOAD_URL_ENDPOINT`.
