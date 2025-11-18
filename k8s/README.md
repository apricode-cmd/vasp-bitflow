# Kubernetes Deployment Files

## Структура

```
k8s/
├── base/                    # Базовые манифесты
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml.template
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── app-deployment.yaml
│   ├── hpa.yaml
│   ├── ingress.yaml
│   └── cronjobs.yaml
├── overlays/
│   ├── dev/                # Development окружение
│   ├── staging/            # Staging окружение
│   └── production/         # Production окружение
└── README.md
```

## Быстрый старт

### 1. Подготовка

```bash
# Создать namespace
kubectl apply -f base/namespace.yaml

# Создать secrets из template
cp base/secret.yaml.template base/secret.yaml
# ВАЖНО: Отредактировать base/secret.yaml с реальными ключами
nano base/secret.yaml

# Применить secrets
kubectl apply -f base/secret.yaml
```

### 2. Deploy инфраструктуры

```bash
# ConfigMap
kubectl apply -f base/configmap.yaml

# PostgreSQL
kubectl apply -f base/postgres.yaml

# Redis
kubectl apply -f base/redis.yaml

# Дождаться готовности БД
kubectl wait --for=condition=ready pod -l app=postgres -n apricode-exchange --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n apricode-exchange --timeout=300s
```

### 3. Deploy приложения

```bash
# Application
kubectl apply -f base/app-deployment.yaml

# HPA (autoscaling)
kubectl apply -f base/hpa.yaml

# Ingress
kubectl apply -f base/ingress.yaml

# CronJobs
kubectl apply -f base/cronjobs.yaml
```

### 4. Проверка

```bash
# Pods
kubectl get pods -n apricode-exchange

# Services
kubectl get svc -n apricode-exchange

# Ingress
kubectl get ingress -n apricode-exchange

# Logs
kubectl logs -f deployment/apricode-app -n apricode-exchange

# HPA status
kubectl get hpa -n apricode-exchange
```

## Environments

### Development
```bash
kubectl apply -k overlays/dev
```

### Staging
```bash
kubectl apply -k overlays/staging
```

### Production
```bash
kubectl apply -k overlays/production
```

## Удаление

```bash
# Удалить всё
kubectl delete namespace apricode-exchange

# Или по файлам
kubectl delete -f base/
```

