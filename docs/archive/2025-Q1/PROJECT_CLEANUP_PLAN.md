# 🧹 Project Cleanup Plan - Enterprise CRM VASP

**Date:** 2025-11-15  
**Status:** 📋 PLANNING  
**Risk Level:** ⚠️ MEDIUM (требует аккуратности)

---

## 📊 Audit Results

### Обнаружено мусора:

| Категория | Количество | Размер | Действие |
|-----------|------------|--------|----------|
| **MD документы** | 169+ файлов | ~5 MB | Архивировать старые |
| **Backup файлы** | 10 .dump | ~500 MB | Переместить в backups/ |
| **SQL скрипты** | 52 файла | ~50 MB | Организовать |
| **Test скрипты** | 30+ .js/.ts | ~2 MB | Переместить в tests/ |
| **Log файлы** | 6 файлов | ~10 MB | Удалить |
| **Temp файлы** | ~10 файлов | ~5 MB | Удалить |

**Потенциальная экономия:** ~570 MB  
**Улучшение читаемости:** ЗНАЧИТЕЛЬНОЕ

---

## 🎯 Стратегия очистки (безопасная)

### Фаза 1: Подготовка ✅
- [x] Создать git commit текущего состояния
- [ ] Создать backup перед очисткой
- [ ] Создать папки для организации

### Фаза 2: Безопасное перемещение 📦
- [ ] Переместить старые MD в `docs/archive/`
- [ ] Переместить backups в `backups/database/`
- [ ] Переместить test скрипты в `scripts/tests/`
- [ ] Переместить SQL в `prisma/manual/archive/`

### Фаза 3: Удаление временных файлов 🗑️
- [ ] Удалить .log файлы
- [ ] Удалить temp_*.sql
- [ ] Удалить check-*.js (после анализа)
- [ ] Удалить test-*.js (после анализа)

### Фаза 4: Проверка и тестирование ✅
- [ ] Проверить что build работает
- [ ] Проверить что dev сервер работает
- [ ] Создать commit после cleanup

---

## 📁 Новая структура

```
crm-vasp/
├── docs/
│   ├── current/          # Актуальная документация
│   │   ├── README.md
│   │   ├── API_DOCUMENTATION.md
│   │   ├── DEPLOYMENT.md
│   │   └── SECURITY.md
│   └── archive/          # Старая документация
│       ├── 2024-Q4/
│       └── 2025-Q1/
│
├── backups/
│   ├── database/         # DB backups (.dump, .sql)
│   └── code/            # Code snapshots
│
├── scripts/
│   ├── deployment/      # Deployment scripts
│   ├── database/        # DB scripts
│   └── tests/           # Test/debug scripts
│
├── prisma/
│   ├── migrations/      # Auto migrations
│   └── manual/          # Manual SQL scripts
│       ├── active/      # Current scripts
│       └── archive/     # Old scripts
│
└── src/                 # Source code (БЕЗ ИЗМЕНЕНИЙ)
```

---

## 🔍 Детальный анализ файлов

### 1. MD документы (169 файлов)

#### ✅ ОСТАВИТЬ (актуальные):
```
README.md
SECURITY.md
DEPLOYMENT.md
API_DOCUMENTATION.md
BUILD_FIX_REPORT.md (новый)
DEPLOYMENT_READY.md (новый)
```

#### 📦 АРХИВИРОВАТЬ (устаревшие):
```
ADMIN_PROFILE_FIX.md (старый)
ADMIN_PROFILE_TEST_GUIDE.md (старый)
AUTH_TEST_RESULTS.md (результаты тестов)
BUGFIX_2FA_CLIENT_AUDIT.md (completed bug)
COMPREHENSIVE_FIX_PLAN.md (completed)
CURRENT_STATUS.md (устарел)
FINAL_STATUS.md (дубликат)
FINAL_SUMMARY.md (дубликат)
KYC_MISMATCH_PROBLEM.md (решено)
LOCAL_TEST_RESULTS.md (результаты)
LOGIN_FIX.md (исправлено)
TESTING_PHASE_1.md (завершен)
... и еще ~150 файлов
```

**Критерий архивации:**
- Содержит "FIX", "PROBLEM", "TESTING" - решенные проблемы
- Содержит "PLAN", "STATUS" - завершенные планы
- Старше 3 месяцев
- Дублирует информацию

### 2. Backup файлы (.dump, .sql)

#### 🗑️ УДАЛИТЬ (дубликаты в backups/):
```
backup_20251107_220835.dump
backup_20251110_141033.dump
backup_20251110_173944.dump
backup_20251110_174011.dump
backup_admin_invite_complete_20251110_145634.dump
backup_before_admin_invite_20251110_144813.dump
backup_before_event_categories_20251110_190648.sql
backup_email_enterprise_20251111_171023.sql
backup_email_enterprise_20251111_171059.sql
backup_email_enterprise_20251111_171123.sql
backup_final_20251110_141429.dump
backup_notification_system_20251110_175130.dump
backup_phase1_3_categories_complete_20251110_191036.sql
backup_phase1_complete_20251110_192554.sql
supabase_dump_20251030_111916.sql
```

**Причина:** Эти backups уже в папке `backups/`

### 3. Test/Debug скрипты

#### 📦 ПЕРЕМЕСТИТЬ в scripts/tests/:
```
check-coingecko-db.ts
check-integration.ts
check-kyc-session.ts
check-kycaid-applicant.ts
check-kycaid-config.ts
check-metadata.js
check-old-applicant.js
check-original-external-id.js
check-sumsub-status-direct.js
check-user-profile.js
cleanup-test-session.js
create-verification-for-applicant.ts
debug-kycaid-applicant.ts
debug-sdk-token.js
debug-session.js
decode-sdk-token.js
find-real-applicant.js
list-all-applicants.js
monitor-kyc-completion.js
seed-blockchains.ts
test-admin-profile.js
test-download-report.ts
test-full-kyc-sync.ts
test-kyc-status-api.js
test-kycaid-api.ts
test-kycaid-data.ts
test-passkey-challenge.ts
test-passkey-service.ts
test-resend-after-save.ts
test-sdk-token-generation.js
test-session-debug.js
test-sumsub-applicant.js
test-sumsub-by-external-id.js
test-sumsub-create-new.js
test-sumsub-detailed.js
test-sumsub-direct.js
test-sumsub-full-flow.js
test-sumsub-get-by-external.js
test-sumsub-list-applicants.js
test-sumsub-required-docs.js
test-sync-detailed.ts
test-sync-documents.ts
test-webhook-locally.js
```

### 4. Log файлы

#### 🗑️ УДАЛИТЬ:
```
build.log
build-test.log
server.log
ngrok.log
migration_log_20251113_125356.txt
```

**Причина:** Временные файлы, логи генерируются заново

### 5. Temporary SQL

#### 🗑️ УДАЛИТЬ или АРХИВИРОВАТЬ:
```
temp_migration.sql
disable-purpose-supabase.sql
fix-coingecko-supabase.sql
check-purpose-fields.sql
insert_blockchains.sql
```

---

## 🚀 Скрипт автоматической очистки

Создам безопасный скрипт который:
1. Создает backup
2. Перемещает файлы в правильные папки
3. Логирует все действия
4. Позволяет откатить изменения

---

## ⚠️ Важные правила

### ✅ НИКОГДА НЕ УДАЛЯТЬ:
- Файлы в `src/`
- Файлы в `prisma/migrations/`
- `package.json`, `package-lock.json`
- `.env` файлы
- `tsconfig.json`, `next.config.js`
- Актуальные README и документацию

### ⚠️ ОСТОРОЖНО:
- Скрипты могут использоваться в CI/CD
- SQL файлы могут быть нужны для rollback
- MD файлы могут содержать важную историю

### 📋 ПРОЦЕСС:
1. Анализ → Планирование → Backup → Действие → Проверка
2. По одной категории за раз
3. Commit после каждого этапа
4. Возможность rollback

---

## 📊 Ожидаемый результат

### До:
```
root/
├── 169 MD файлов
├── 15 backup файлов
├── 45 test скриптов
├── 6 log файлов
├── 52 SQL файла
└── Беспорядок
```

### После:
```
root/
├── 5-10 актуальных MD
├── docs/
│   ├── current/
│   └── archive/
├── backups/
│   └── database/
├── scripts/
│   ├── deployment/
│   ├── database/
│   └── tests/
└── Порядок ✨
```

---

## 🎯 Следующие шаги

1. **Согласовать план** - получить одобрение
2. **Создать backup** - полный snapshot проекта
3. **Создать скрипт** - автоматизация безопасной очистки
4. **Выполнить Phase 1** - создание структуры папок
5. **Выполнить Phase 2** - перемещение файлов
6. **Выполнить Phase 3** - удаление временных
7. **Тестирование** - проверка работоспособности
8. **Commit & Push** - зафиксировать изменения

---

## 💾 Rollback план

Если что-то пойдет не так:

```bash
# Вернуться к последнему commit
git reset --hard HEAD

# Или восстановить из backup
cp -r backup_before_cleanup/* .
```

---

**Готов начинать?** Предлагаю начать с создания backup и структуры папок.

