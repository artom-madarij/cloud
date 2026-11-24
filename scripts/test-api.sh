#!/usr/bin/env bash
set -euo pipefail
LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$LAB_DIR/terraform"
ENV_FILE="$LAB_DIR/emulator/.env"
EVIDENCE_DIR="$LAB_DIR/evidence"
mkdir -p "$EVIDENCE_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Не знайдено emulator/.env" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
: "${API_KEY:?У .env не задано API_KEY}"
INGEST_URL="$(terraform -chdir="$TF_DIR" output -raw iot_ingest_url)"
HISTORY_BASE="$(terraform -chdir="$TF_DIR" output -raw iot_history_route)"
TS="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

curl -sS -i -X POST "$INGEST_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"sensor_id\":\"temperature-test-01\",\"sensor_type\":\"temperature\",\"value\":25.5,\"unit\":\"°C\",\"location\":{\"lat\":49.8397,\"lon\":24.0297},\"measured_at\":\"$TS\"}" \
  | tee "$EVIDENCE_DIR/post-success.txt"

sleep 5
HISTORY_URL="${HISTORY_BASE/\{sensor_id\}/temperature-test-01}"
curl -sS --get "$HISTORY_URL" \
  --data-urlencode "from=2026-01-01T00:00:00Z" \
  --data-urlencode "to=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --data-urlencode "limit=100" \
  -o "$EVIDENCE_DIR/history.json" \
  -w "HTTP_STATUS=%{http_code}\n" \
  | tee "$EVIDENCE_DIR/history-status.txt"
