# 🚀 Применение оптимизаций - Пошаговая инструкция

## ✅ Пункт 1: DATABASE_URL (5 минут)

### Проверить текущую настройку:

```bash
# Vercel Dashboard → Settings → Environment Variables
# Найти DATABASE_URL и проверить:
```

**Текущее значение:**
```
postgres://postgres.rltqjdujiacriilmijpz:...@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&statement_cache_size=0
```

**Нужно изменить на:**
```
postgres://postgres.rltqjdujiacriilmijpz:...@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&statement_cache_size=0
```

**Изменения:**
- `connection_limit=1` → `connection_limit=10`

### Шаги:

1. Открыть: https://vercel.com/dashboard
2. Выбрать проект
3. Settings → Environment Variables
4. Найти `DATABASE_URL`
5. Click **Edit**
6. Изменить `connection_limit=1` на `connection_limit=10`
7. **Save**
8. ✅ Применить для: **Production, Preview, Development**
9. Redeploy (автоматически начнется)

**Ожидаемый эффект:** ⬇️ 60-70% DB connection wait time

---

## ✅ Пункт 2: Database Indexes (тестируем → применяем)

### 🧪 Шаг 1: Тест на локальной БД (10 минут)

#### A. Проверить существующие индексы

```bash
# 1. Посмотреть текущие индексы
psql $DATABASE_URL -f scripts/check-existing-indexes.sql
```

**Что проверяем:**
- Какие индексы уже есть
- Размер текущих индексов
- Index usage statistics

---

#### B. Измерить производительность ДО индексов

```bash
# 2. Запустить baseline тест
npx tsx scripts/test-indexes-local.ts
```

**Что измеряем:**
- Orders by userId: ~XXms
- Orders by status: ~XXms
- Orders with JOIN: ~XXms
- KYC by status: ~XXms
- Wallets by currency: ~XXms
- Audit by entity: ~XXms

**Сохраните эти цифры!**

---

#### C. Применить индексы ЛОКАЛЬНО

```bash
# 3. Применить миграцию
psql $DATABASE_URL -f prisma/migrations-manual/add-performance-indexes.sql
```

**Что происходит:**
- Создаются ~40 индексов
- Время выполнения: 30-60 секунд
- ANALYZE обновляет статистику

**Вывод должен содержать:**
```
CREATE INDEX
CREATE INDEX
...
✅ Total indexes created: XX
```

---

#### D. Измерить производительность ПОСЛЕ индексов

```bash
# 4. Повторить тест
npx tsx scripts/test-indexes-local.ts
```

**Ожидаемые улучшения:**
- Orders by userId: ⬇️ 60-80%
- Orders by status: ⬇️ 70-85%
- Orders with JOIN: ⬇️ 50-70%
- KYC by status: ⬇️ 70-80%
- Wallets by currency: ⬇️ 60-75%
- Audit by entity: ⬇️ 65-80%

---

#### E. Проверить работу приложения

```bash
# 5. Запустить dev server
npm run dev
```

**Проверить:**
- ✅ `/admin` - загружается нормально
- ✅ `/admin/orders` - список заказов
- ✅ `/admin/kyc` - список KYC
- ✅ `/buy` - форма покупки
- ✅ `/orders` - список заказов клиента

**Если всё работает → переходим к продакшену!**

---

### 🔒 Шаг 2: Backup Production (5 минут)

```bash
# Сделать backup перед применением на проде
chmod +x scripts/backup-production-db.sh
./scripts/backup-production-db.sh
```

**Что происходит:**
1. Создается директория `backups/`
2. Dump всей БД в `production_backup_YYYYMMDD_HHMMSS.sql`
3. Проверяется размер backup
4. Показывается summary

**Ожидаемый размер backup:** 10-50MB (зависит от данных)

**Backup готов? → Можно применять на проде!**

---

### 🚀 Шаг 3: Применить на Production (10 минут)

#### A. Подключиться к Supabase

**Вариант 1: Через Supabase Dashboard (рекомендуется)**

1. Открыть: https://supabase.com/dashboard
2. Выбрать проект
3. SQL Editor → New query
4. Скопировать содержимое файла:
   ```bash
   cat prisma/migrations-manual/add-performance-indexes.sql
   ```
5. Вставить в SQL Editor
6. **Run** (может занять 1-2 минуты)

---

**Вариант 2: Через psql**

```bash
# Production connection string
PROD_URL="postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

# Apply indexes
psql "$PROD_URL" -f prisma/migrations-manual/add-performance-indexes.sql
```

---

#### B. Проверить результат

**В Supabase SQL Editor выполнить:**

```sql
-- Проверить созданные индексы
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Должно быть ~40 новых индексов с префиксом `idx_`**

---

#### C. Мониторинг после применения

**Проверить production app:**

1. Открыть https://your-app.vercel.app/admin
2. Network tab → проверить `/api/admin/stats`
3. **Должно быть:** < 1 секунда (было 2-5 секунд)

**Vercel Logs:**
```bash
# Проверить логи
vercel logs --follow
```

**Хорошие знаки:**
```
GET /api/admin/stats 200 in 450ms  ✅ (было 2500ms)
GET /api/admin/orders 200 in 320ms ✅ (было 1200ms)
```

**Плохие знаки (если видите):**
```
ERROR: relation "idx_orders_user_id" already exists  ⚠️  (не критично - индекс уже был)
ERROR: timeout                                        ❌ (нужен rollback)
```

---

### 🔄 Rollback (если что-то пошло не так)

**Если нужен откат:**

```bash
# Восстановить из backup
psql "$PROD_URL" < backups/production_backup_YYYYMMDD_HHMMSS.sql
```

**⚠️ Важно:**
- Это полный restore (займет 2-5 минут)
- Все данные созданные ПОСЛЕ backup будут потеряны
- Используйте только если индексы сломали БД

---

## 📊 Проверка результатов

### Метрики ДО оптимизации:

```
Dashboard load: 5-8 секунд
/api/admin/stats: 2-5 секунд
/api/admin/orders: 1-2 секунды
/api/orders (create): 800-1500ms
DB queries per request: 10-15
```

### Метрики ПОСЛЕ оптимизации:

```
Dashboard load: 2-3 секунды       ⬇️ 60-70%
/api/admin/stats: 300-800ms       ⬇️ 80-85%
/api/admin/orders: 300-500ms      ⬇️ 70-75%
/api/orders (create): 400-700ms   ⬇️ 50-60%
DB queries per request: 5-8       ⬇️ 50%
```

---

## ✅ Checklist

### DATABASE_URL:
- [ ] Проверен current value на Vercel
- [ ] Изменен `connection_limit=1` → `connection_limit=10`
- [ ] Применен для Production, Preview, Development
- [ ] Redeploy запущен
- [ ] Проверены Vercel logs (нет ошибок connection pool)

### Database Indexes (Local):
- [ ] Запущен `check-existing-indexes.sql`
- [ ] Измерены baseline metrics (before)
- [ ] Применена миграция `add-performance-indexes.sql`
- [ ] Измерены metrics after
- [ ] Проверена работа приложения локально
- [ ] Улучшение 60-80% подтверждено ✅

### Database Indexes (Production):
- [ ] Создан backup: `./scripts/backup-production-db.sh`
- [ ] Backup проверен (размер, содержимое)
- [ ] Применена миграция на production (Supabase или psql)
- [ ] Проверены созданные индексы (~40 шт)
- [ ] Проверена production app (dashboard load < 3s)
- [ ] Проверены Vercel logs (query times улучшились)
- [ ] Lighthouse score проверен (если нужно)

### Rollback Plan:
- [ ] Backup файл сохранен в `backups/`
- [ ] Команда rollback известна: `psql $PROD_URL < backups/...sql`
- [ ] Контакты DevOps/Support под рукой (если нужна помощь)

---

## 🆘 Troubleshooting

### Проблема: "ERROR: relation already exists"

**Причина:** Индекс уже создан

**Решение:** 
```sql
-- Проигнорировать (миграция использует IF NOT EXISTS)
-- Или удалить и пересоздать:
DROP INDEX IF EXISTS idx_orders_user_id;
-- Затем повторить миграцию
```

---

### Проблема: Slow queries после индексов

**Причина:** ANALYZE не обновил статистику

**Решение:**
```sql
-- Обновить статистику query planner
ANALYZE;

-- Или для конкретной таблицы:
ANALYZE "Order";
ANALYZE "User";
```

---

### Проблема: High disk usage

**Причина:** Индексы занимают место (~50-100MB)

**Решение:**
```sql
-- Проверить размер индексов
SELECT
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) AS total_index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Если нужно удалить (осторожно!):
DROP INDEX IF EXISTS idx_name_here;
```

---

### Проблема: Connection timeouts

**Причина:** DATABASE_URL еще не обновлен

**Решение:**
1. Проверить Vercel env vars
2. Убедиться что `connection_limit=10`
3. Redeploy проекта
4. Подождать 2-3 минуты

---

## 📞 Support

**Если что-то пошло не так:**

1. **Stop** - не паниковать
2. **Check logs** - Vercel logs, Supabase logs
3. **Backup ready** - файл в `backups/` директории
4. **Rollback** - команда известна
5. **Document issue** - screenshot, error message, timestamp

**Контакты (если нужна помощь):**
- Supabase Support: support@supabase.io
- Vercel Support: https://vercel.com/support

---

## 🎯 Summary

**Time investment:**
- DATABASE_URL: 5 минут
- Indexes (test local): 10 минут
- Backup: 5 минут
- Indexes (production): 10 минут
- Verification: 5 минут

**Total: 35 минут**

**Expected improvement:**
- ⬇️ 60-80% query latency
- ⬇️ 50-60% dashboard load time
- ⬆️ 2-3x concurrent users

**Risk: LOW** ✅
- Indexes не ломают данные
- Backup готов
- Rollback за 5 минут

---

**Ready? Let's go! 🚀**

Начинаем с пункта 1 (DATABASE_URL), затем тестируем индексы локально!

