# Лабораторні роботи №2

**Виконав:** Мадярій Артьом, група ІР-34, ІКТА

**Проєкт:** Lamp Store — інтернет-магазин із REST API.

## Про проєкт

Застосунок складається з React frontend, Node.js REST API
та бази даних MySQL.

## Хмарна архітектура

Internet → Application Load Balancer → ECS Fargate → Amazon RDS (MySQL)

## Лабораторна робота №2

У другій лабораторній додано:

- Автоматичне масштабування ECS від 1 до 3 екземплярів
  за середнім завантаженням CPU з цільовим значенням 60%.
- Навантажувальне тестування за допомогою k6.
- Панель моніторингу CloudWatch із п'ятьма графіками.
- Сповіщення на електронну пошту через CloudWatch та SNS.
- Кешування операцій читання

## Структура проєкту

```text
cloud/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docs/
│   ├── AUTOSCALING.md
│   ├── ALERTS.md
│   ├── LOADTEST.md
│   └── images/
├── lab1/
│   ├── backend_lab11/
│   ├── lab11/
│   ├── terraform/
│   │   ├── autoscaling.tf
│   │   └── ...
│   ├── compose.yaml
│   ├── Dockerfile
│   ├── migration.Dockerfile
│   └── migrate.sh
├── loadtest/
│   └── script.js
└── README.md
