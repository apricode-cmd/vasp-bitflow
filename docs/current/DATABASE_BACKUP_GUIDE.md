# 🔧 Database Backup & Webhook Migration Guide

## 📋 Шаг 1: Создать бекап базы данных

### Вариант 1: Через psql (рекомендуется)

```bash
# Создать папку для бекапов
mkdir -p backups

# Создать бекап с timestamp
pg_dump -h localhost -U postgres -d apricode_dev > backups/apricode_dev_backup_$(date +%Y%m%d_%H%M%S).sql

# Или более детальный бекап
pg_dump -h localhost -U postgres -d apricode_dev --format=custom --file=backups/apricode_dev_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Вариант 2: Через Prisma Studio

1. Открыть Prisma Studio: `npx prisma studio`
2. Экспортировать важные таблицы вручную

### Вариант 3: Через pgAdmin

1. Открыть pgAdmin
2. Правый клик на `apricode_dev` → Backup
3. Выбрать формат: Custom или Plain
4. Сохранить в `backups/`

---

## 📋 Шаг 2: Применить Webhook миграцию

### Автоматически (через SQL файл)

```bash
# Применить миграцию
psql -h localhost -U postgres -d apricode_dev -f prisma/migrations/manual_add_webhooks.sql

# Проверить результат
psql -h localhost -U postgres -d apricode_dev -c "\dt Webhook*"
```

### Вручную (если нужно)

```sql
-- Подключиться к базе
psql -h localhost -U postgres -d apricode_dev

-- Выполнить команды из manual_add_webhooks.sql
-- (скопировать и вставить содержимое файла)
```

---

## 📋 Шаг 3: Сгенерировать Prisma Client

```bash
# Сгенерировать новый Prisma Client с Webhook моделями
npx prisma generate

# Проверить, что всё работает
npm run dev
```

---

## 🔄 Восстановление из бекапа (если что-то пошло не так)

### Из .sql файла

```bash
# Остановить приложение
# Ctrl+C в терминале где запущен npm run dev

# Удалить текущую базу
dropdb -h localhost -U postgres apricode_dev

# Создать новую базу
createdb -h localhost -U postgres apricode_dev

# Восстановить из бекапа
psql -h localhost -U postgres -d apricode_dev < backups/apricode_dev_backup_YYYYMMDD_HHMMSS.sql

# Перезапустить приложение
npm run dev
```

### Из .dump файла (custom format)

```bash
# Восстановить из custom dump
pg_restore -h localhost -U postgres -d apricode_dev backups/apricode_dev_backup_YYYYMMDD_HHMMSS.dump
```

---

## ✅ Проверка после миграции

```bash
# 1. Проверить таблицы
psql -h localhost -U postgres -d apricode_dev -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'Webhook%';"

# Ожидаемый результат:
#  tablename      
# ----------------
#  Webhook
#  WebhookDelivery

# 2. Проверить enum
psql -h localhost -U postgres -d apricode_dev -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'WebhookDeliveryStatus'::regtype;"

# Ожидаемый результат:
#  enumlabel  
# ------------
#  PENDING
#  PROCESSING
#  DELIVERED
#  FAILED
#  CANCELLED

# 3. Проверить индексы
psql -h localhost -U postgres -d apricode_dev -c "\d Webhook"
psql -h localhost -U postgres -d apricode_dev -c "\d WebhookDelivery"
```

---

## 🚨 Troubleshooting

### Проблема: "role postgres does not exist"

```bash
# Использовать свой username
pg_dump -h localhost -U your_username -d apricode_dev > backup.sql
```

### Проблема: "password authentication failed"

```bash
# Добавить пароль в команду
PGPASSWORD=your_password pg_dump -h localhost -U postgres -d apricode_dev > backup.sql

# Или использовать интерактивный ввод
pg_dump -h localhost -U postgres -d apricode_dev -W > backup.sql
```

### Проблема: "database apricode_dev does not exist"

```bash
# Проверить список баз
psql -h localhost -U postgres -l

# Использовать правильное имя базы
```

### Проблема: "type WebhookDeliveryStatus already exists"

```sql
-- Удалить существующий enum
DROP TYPE IF EXISTS "WebhookDeliveryStatus" CASCADE;

-- Затем применить миграцию заново
```

---

## 📊 Размер бекапа

```bash
# Проверить размер базы данных
psql -h localhost -U postgres -d apricode_dev -c "SELECT pg_size_pretty(pg_database_size('apricode_dev'));"

# Проверить размер бекапа
ls -lh backups/
```

---

## 🎯 Быстрая команда (всё в одном)

```bash
# 1. Бекап
mkdir -p backups && pg_dump -h localhost -U postgres -d apricode_dev > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Применить миграцию
psql -h localhost -U postgres -d apricode_dev -f prisma/migrations/manual_add_webhooks.sql

# 3. Сгенерировать Prisma Client
npx prisma generate

# 4. Перезапустить сервер
# Ctrl+C и затем npm run dev
```

---

## 📝 Примечания

1. **Всегда делайте бекап перед миграцией!**
2. Бекапы хранятся в папке `backups/`
3. Рекомендуется хранить бекапы минимум 7 дней
4. Для production используйте автоматические бекапы (cron job)
5. Проверяйте бекапы периодически (пробуйте восстанавливать)

---

**Создано:** 2025-11-11  
**Версия:** 1.0

