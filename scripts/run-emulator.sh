#!/usr/bin/env bash
set -euo pipefail
LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$LAB_DIR/emulator"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Створено emulator/.env. Заповни API_KEY та запусти скрипт повторно." >&2
  exit 1
fi
npm start 2>&1 | tee "$LAB_DIR/evidence/emulator.log"
