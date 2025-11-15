# 🐳 Docker Deployment Guide

## Быстрый старт

### 1. Локальная разработка

```bash
# Сборка образа
docker build -t apricode-exchange:1.0 .

# Запуск с docker-compose
docker-compose up -d

# Просмотр логов
docker-compose logs -f app

# Остановка
docker-compose down
```

Приложение доступно на: http://localhost:3000

---

### 2. Multi-Tenant deployment (несколько клиентов)

```bash
# Создайте .env файл с переменными для всех клиентов
cp .env.example .env.multi-tenant

# Запустите все инстансы
docker-compose -f docker-compose.multi-tenant.yml up -d

# Клиенты будут доступны на:
# - http://localhost:3001 (Client 1)
# - http://localhost:3002 (Client 2)
# - http://localhost:3003 (Client 3)
```

---

## Production Deployment

### Вариант 1: VPS (DigitalOcean, Hetzner)

#### Шаг 1: Настройка сервера

```bash
# SSH в сервер
ssh root@your-server-ip

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка
docker --version
docker-compose --version
```

#### Шаг 2: Deploy приложения

```bash
# Клонирование репозитория
git clone <your-repo-url>
cd "crm vasp"

# Создание .env файла
nano .env
# (скопируйте ваши production переменные)

# Сборка и запуск
docker-compose up -d

# Проверка статуса
docker-compose ps
docker-compose logs -f
```

#### Шаг 3: Nginx + SSL

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com

# Автообновление
sudo certbot renew --dry-run
```

---

### Вариант 2: Docker Swarm (для масштабирования)

```bash
# Инициализация Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml apricode

# Масштабирование
docker service scale apricode_app=3

# Статус
docker stack ps apricode
```

---

### Вариант 3: Kubernetes (см. COMMERCIALIZATION_STRATEGY.md)

---

## Управление контейнерами

### Основные команды

```bash
# Просмотр работающих контейнеров
docker ps

# Логи приложения
docker logs -f apricode-exchange

# Выполнение команд внутри контейнера
docker exec -it apricode-exchange sh

# Перезапуск
docker-compose restart app

# Пересборка после изменений
docker-compose up -d --build

# Полная очистка
docker-compose down -v
docker system prune -a
```

---

## Миграции базы данных

### Автоматические (при старте контейнера)

Миграции запускаются автоматически через `docker-entrypoint.sh`

### Ручные миграции

```bash
# Вход в контейнер
docker exec -it apricode-exchange sh

# Запуск миграций
npx prisma migrate deploy

# Seed данных
npx prisma db seed

# Prisma Studio
npx prisma studio
```

---

## Backup & Restore

### Backup PostgreSQL

```bash
# Backup базы данных
docker exec apricode-db pg_dump -U postgres apricode > backup_$(date +%Y%m%d).sql

# Backup с сжатием
docker exec apricode-db pg_dump -U postgres apricode | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore PostgreSQL

```bash
# Restore из backup
cat backup_20241115.sql | docker exec -i apricode-db psql -U postgres -d apricode

# Restore из gzip
gunzip -c backup_20241115.sql.gz | docker exec -i apricode-db psql -U postgres -d apricode
```

---

## Мониторинг

### Docker Stats

```bash
# Ресурсы в реальном времени
docker stats

# Только нужный контейнер
docker stats apricode-exchange
```

### Логи

```bash
# Все логи
docker-compose logs

# Только приложение
docker-compose logs app

# Последние 100 строк
docker-compose logs --tail=100 app

# Follow логи
docker-compose logs -f app
```

### Health Checks

```bash
# Проверка здоровья
docker inspect --format='{{.State.Health.Status}}' apricode-exchange

# Ручная проверка API
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Смотрим логи
docker logs apricode-exchange

# Проверяем конфигурацию
docker-compose config

# Пересоздаем контейнер
docker-compose up -d --force-recreate app
```

### Проблема: База данных недоступна

```bash
# Проверяем статус БД
docker-compose ps db

# Логи БД
docker-compose logs db

# Подключение к БД
docker exec -it apricode-db psql -U postgres -d apricode
```

### Проблема: Нехватка памяти

```bash
# Проверяем использование
docker stats

# Увеличиваем лимиты в docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
```

### Проблема: Медленная сборка

```bash
# Используем BuildKit
DOCKER_BUILDKIT=1 docker build -t apricode-exchange:1.0 .

# Очистка cache
docker builder prune
```

---

## Security Best Practices

### 1. Не храните секреты в образе

```dockerfile
# ❌ Плохо
ENV DATABASE_URL="postgresql://..."

# ✅ Хорошо
# Передавайте через docker-compose или переменные окружения
```

### 2. Используйте non-root пользователя

```dockerfile
USER nextjs  # ✅ Уже настроено в Dockerfile
```

### 3. Scan образа на уязвимости

```bash
# Docker Scout
docker scout cves apricode-exchange:1.0

# Trivy
trivy image apricode-exchange:1.0
```

### 4. Регулярно обновляйте base images

```dockerfile
FROM node:20-alpine  # Всегда указывайте версию
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/docker-build.yml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: docker build -t apricode-exchange:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push apricode-exchange:${{ github.sha }}
```

---

## Performance Optimization

### 1. Multi-stage build (уже реализовано)

Уменьшает размер образа с ~1GB до ~200MB

### 2. Используйте .dockerignore

Исключает ненужные файлы из build context

### 3. Layer caching

```dockerfile
# Сначала копируем package.json (кешируется)
COPY package.json ./
RUN npm install

# Потом остальные файлы
COPY . .
```

### 4. Оптимизация Next.js

```javascript
// next.config.js
module.exports = {
  output: 'standalone',  // ✅ Уменьшает размер
  compress: true,
  productionBrowserSourceMaps: false
}
```

---

## Масштабирование

### Horizontal Scaling (несколько инстансов)

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3  # 3 экземпляра
      
  nginx:
    # Load balancer
```

### Vertical Scaling (больше ресурсов)

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

---

## Полезные ссылки

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)

---

**Следующий шаг:** [Partner Panel Setup](./PARTNER_PANEL_SETUP.md)

