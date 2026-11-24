#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$LAB_DIR/terraform"
ENV_FILE="$LAB_DIR/emulator/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [[ -n "${API_KEY:-}" ]]; then
    export TF_VAR_ingest_api_key="$API_KEY"
  fi
fi

if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  echo "Не знайдено terraform/terraform.tfvars. Створи його з terraform.tfvars.example." >&2
  exit 1
fi

terraform -chdir="$TF_DIR" init
terraform -chdir="$TF_DIR" plan -destroy
echo "Перевір план вище. Terraform зараз попросить підтвердження destroy."
terraform -chdir="$TF_DIR" destroy
