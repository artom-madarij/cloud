# Розгортання Lab 3

1. Переконайся, що AWS CLI працює: `aws sts get-caller-identity`.
2. Створи `emulator/.env` на основі `emulator/.env.example` та задай `API_KEY` (не менше 32 символів).
3. Запусти `./scripts/deploy.sh`.
4. Перевір Terraform outputs: `terraform -chdir=terraform output`.
5. Запусти емулятор: `./scripts/run-emulator.sh`.
6. Перевір API: `./scripts/test-api.sh`.

Terraform state зберігається локально в `terraform/terraform.tfstate`. Не копіюй сюди state від `lab1/terraform` і не додавай state у Git.
