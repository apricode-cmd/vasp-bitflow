# 🗄️ Database Migration Guide: Conditional Logic

## Что добавляем:
- `dependsOn` (TEXT) - родительское поле
- `showWhen` (JSONB) - условие показа

---

## 🏠 **Локальная разработка** (автоматически)

### Вариант 1: Prisma Migrate (рекомендуется)
```bash
# 1. Генерируем миграцию из schema.prisma
npx prisma migrate dev --name add-conditional-logic-fields

# 2. Применяется автоматически
# 3. Проверяем
npx prisma studio
```

### Вариант 2: Только DB Push (без истории миграций)
```bash
npx prisma db push
```

---

## ☁️ **Supabase Production** (вручную)

### Шаг 1: Откройте SQL Editor в Supabase
1. Зайдите на https://supabase.com
2. Выберите ваш проект
3. SQL Editor → New query

### Шаг 2: Скопируйте и выполните SQL
```sql
-- Добавить колонки
ALTER TABLE "KycFormField" 
ADD COLUMN IF NOT EXISTS "dependsOn" TEXT,
ADD COLUMN IF NOT EXISTS "showWhen" JSONB;

-- Добавить индекс
CREATE INDEX IF NOT EXISTS "KycFormField_dependsOn_idx" 
ON "KycFormField"("dependsOn");

-- Комментарии (опционально)
COMMENT ON COLUMN "KycFormField"."dependsOn" IS 
'Parent field name that this field depends on';

COMMENT ON COLUMN "KycFormField"."showWhen" IS 
'JSON condition: {"operator": "!=", "value": "NO"}';
```

### Шаг 3: Проверка
```sql
-- Проверить что колонки добавлены
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'KycFormField'
AND column_name IN ('dependsOn', 'showWhen');

-- Должны увидеть:
-- dependsOn  | text   | YES
-- showWhen   | jsonb  | YES
```

---

## 📊 **Опциональная популяция данных**

### Если хотите сразу заполнить условия:

```sql
-- PEP fields: показывать если pep_status != 'NO'
UPDATE "KycFormField" 
SET 
  "dependsOn" = 'pep_status',
  "showWhen" = '{"operator": "!=", "value": "NO"}'
WHERE "fieldName" IN (
  'pep_role_title', 
  'pep_institution', 
  'pep_country', 
  'pep_since'
);

-- Employment: показывать для EMPLOYED_FT/PT
UPDATE "KycFormField" 
SET 
  "dependsOn" = 'employment_status',
  "showWhen" = '{"operator": "in", "value": ["EMPLOYED_FT", "EMPLOYED_PT"]}'
WHERE "fieldName" IN (
  'employer_name', 
  'job_title', 
  'industry', 
  'employment_country'
);

-- Проверка
SELECT "fieldName", "dependsOn", "showWhen"
FROM "KycFormField"
WHERE "dependsOn" IS NOT NULL;
```

---

## ⚠️ **Важно!**

### До миграции:
- ✅ Сделайте бэкап БД в Supabase (Settings → Database → Backups)
- ✅ Протестируйте миграцию локально

### После миграции:
- ✅ Убедитесь что существующие формы работают (hardcoded логика остается)
- ✅ Новые поля `NULL` по умолчанию → не ломает существующий код
- ✅ Phase 2 код будет проверять: `field.dependsOn ? dynamic : hardcoded`

---

## 🔄 **Откат (если что-то пошло не так)**

### Локально:
```bash
npx prisma migrate resolve --rolled-back add-conditional-logic-fields
npx prisma db push
```

### Supabase:
```sql
-- Удалить индекс
DROP INDEX IF EXISTS "KycFormField_dependsOn_idx";

-- Удалить колонки
ALTER TABLE "KycFormField" 
DROP COLUMN IF EXISTS "showWhen",
DROP COLUMN IF EXISTS "dependsOn";
```

---

## 📝 **Checklist**

- [ ] Локально: `npx prisma migrate dev`
- [ ] Локально: протестировать формы KYC
- [ ] Supabase: бэкап БД
- [ ] Supabase: выполнить SQL миграцию
- [ ] Supabase: проверить колонки
- [ ] Production: протестировать формы KYC
- [ ] (Опционально) Заполнить данные условий

---

## 🎯 **После миграции**

Код автоматически начнет использовать новые поля:

```typescript
// conditionalLogic.ts будет проверять:
if (field.dependsOn && field.showWhen) {
  // Dynamic logic from DB
  return evaluateCondition(field, formData);
} else {
  // Fallback to hardcoded logic
  return shouldShowFieldHardcoded(field, formData);
}
```

Это позволит:
1. **Phase 1 (сейчас)**: hardcoded логика работает
2. **Phase 2 (после админки)**: постепенный переход на DB-driven
3. **Обратная совместимость**: если `dependsOn = NULL` → hardcoded

