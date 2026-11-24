#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$LAB_DIR/terraform"
ENV_FILE="$LAB_DIR/emulator/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$LAB_DIR/emulator/.env.example" "$ENV_FILE"
  echo "Створено emulator/.env. Заповни API_KEY і запусти скрипт ще раз." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${API_KEY:-}" || ${#API_KEY} -lt 32 || "$API_KEY" == replace-* ]]; then
  echo "Встанови справжній API_KEY у emulator/.env (не менше 32 символів; не placeholder)." >&2
  exit 1
fi
export TF_VAR_ingest_api_key="$API_KEY"

if [[ ! -f "$TF_DIR/terraform.tfvars" ]] || grep -q 'your-email@example.com' "$TF_DIR/terraform.tfvars"; then
  read -r -p "Email для AWS Budget: " budget_email
  if [[ -z "$budget_email" ]]; then
    echo "Email не може бути порожнім." >&2
    exit 1
  fi
  printf 'budget_email = "%s"\n' "$budget_email" > "$TF_DIR/terraform.tfvars"
  chmod 600 "$TF_DIR/terraform.tfvars"
fi

(cd "$LAB_DIR/functions/ingest" && npm ci)
(cd "$LAB_DIR/functions/processor" && npm ci)
(cd "$LAB_DIR/functions/history" && npm ci)

terraform -chdir="$TF_DIR" init
terraform -chdir="$TF_DIR" validate
terraform -chdir="$TF_DIR" plan
terraform -chdir="$TF_DIR" apply

new_url="$(terraform -chdir="$TF_DIR" output -raw iot_ingest_url)"
python3 - "$new_url" "$ENV_FILE" <<'PY'
from pathlib import Path
import sys
url, filename = sys.argv[1], sys.argv[2]
path = Path(filename)
lines = path.read_text().splitlines()
for i, line in enumerate(lines):
    if line.startswith("INGEST_URL="):
        lines[i] = f"INGEST_URL={url}"
        break
else:
    lines.append(f"INGEST_URL={url}")
path.write_text("\n".join(lines) + "\n")
print(f"INGEST_URL оновлено: {url}")
PY

echo "Lab 3 deployed successfully. Запусти ./scripts/run-emulator.sh"
