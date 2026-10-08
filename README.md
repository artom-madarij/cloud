# Лабораторна робота №1 — AWS Deployment

**Виконав:** студент групи ІР-34, ІКТА — Мадярій Артьом  
**Застосунок:** Lamp Store REST API  

## Хмарна архітектура
`Internet` → `Application Load Balancer` → `ECS Fargate` → `Amazon RDS (MySQL)`

## Публічна адреса
`http://lamp-store-alb-150574506.eu-central-1.elb.amazonaws.com`

## Використані технології
- **AWS:** ECS Fargate (ARM64), ECR, RDS MySQL, ALB
- **IaC & CI/CD:** Terraform, GitHub Actions (OIDC)
- **DevOps:** Docker, Docker Compose

## Структура проєкту
```text
CLOUD/
├── .github/
│   └── workflows/
│       └── deploy.yml        # CI-CD пайплайн для автоматичного деплою
├── lab1/
│   ├── backend_lab11/        # Node.js Express REST API
│   ├── lab11/                # React Frontend
│   ├── terraform/            # Terraform конфігурація AWS
│   ├── compose.yaml          # Локальний Docker Compose setup
│   └── Dockerfile            # Multi-stage Dockerfile (ARM64)
├── .gitignore
└── README.md

Виконано додаткові завдання №7 та №8:

* №7 — CloudWatch Monitoring та сповіщення через SNS.
* №8 — Swagger UI для документації REST API.
