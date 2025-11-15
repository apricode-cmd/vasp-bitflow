# 🧪 Phase 1 - Testing Guide

**Дата:** 10 ноября 2025  
**Версия:** Phase 1 Complete  
**Бэкап:** `backup_phase1_complete_20251110_192554.sql`

---

## 🎯 Цель тестирования

Проверить все функции Phase 1:
- Phase 1.1: Template Integration
- Phase 1.2: Variable Schema
- Phase 1.3: Dynamic Event Categories

---

## 🔐 Pre-requisites

1. **Dev сервер запущен:**
   ```bash
   npm run dev
   # http://localhost:3000
   ```

2. **База данных:**
   - PostgreSQL запущен
   - Seed выполнен (7 категорий, 17 событий)

3. **Учётные данные:**
   - Admin: `admin@apricode.io` / `SecureAdmin123!`
   - Client: `client@test.com` / `TestClient123!`

---

## 📋 Test Cases

### 1. Database Verification ✅

**Цель:** Проверить структуру БД

```bash
# 1.1 Проверить таблицу NotificationEventCategory
psql -U bogdankononenko -d apricode_dev -c "\d \"NotificationEventCategory\""
# Ожидается: 13 полей (id, code, name, description, icon, color, parentId, isSystem, isActive, sortOrder, createdAt, updatedAt, createdBy)

# 1.2 Проверить количество категорий
psql -U bogdankononenko -d apricode_dev -c "SELECT COUNT(*) FROM \"NotificationEventCategory\";"
# Ожидается: 7

# 1.3 Проверить категории
psql -U bogdankononenko -d apricode_dev -c "SELECT code, name, icon, color FROM \"NotificationEventCategory\" ORDER BY \"sortOrder\";"
# Ожидается: ORDER, KYC, PAYMENT, SECURITY, SYSTEM, ADMIN, MARKETING

# 1.4 Проверить NotificationEvent
psql -U bogdankononenko -d apricode_dev -c "\d \"NotificationEvent\"" | grep -E "categoryId|templateId|variableSchema"
# Ожидается: categoryId, templateId, variableSchema, requiredVariables, optionalVariables

# 1.5 Проверить события
psql -U bogdankononenko -d apricode_dev -c "SELECT COUNT(*) FROM \"NotificationEvent\";"
# Ожидается: 17 (или больше)
```

**Status:** [ ] PASS / [ ] FAIL

---

### 2. API Testing - Categories

#### 2.1 GET /api/admin/notification-categories

**Test:** Получить список категорий

```bash
curl -X GET http://localhost:3000/api/admin/notification-categories \
  -H "Cookie: your-session-cookie" \
  | jq '.categories | length'
```

**Expected:** 7 категорий

**Checklist:**
- [ ] Status 200
- [ ] `success: true`
- [ ] 7 категорий в массиве
- [ ] Каждая категория имеет: id, code, name, icon, color, _count.events
- [ ] Сортировка по sortOrder

**Status:** [ ] PASS / [ ] FAIL

---

#### 2.2 POST /api/admin/notification-categories

**Test:** Создать новую категорию

```bash
curl -X POST http://localhost:3000/api/admin/notification-categories \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "code": "TEST_CATEGORY",
    "name": "Test Category",
    "description": "Test description",
    "icon": "Sparkles",
    "color": "#FF5733",
    "sortOrder": 100,
    "isActive": true
  }' | jq '.'
```

**Expected:** Категория создана

**Checklist:**
- [ ] Status 200
- [ ] `success: true`
- [ ] Категория возвращена с ID
- [ ] `createdBy` заполнен

**Validation Tests:**
- [ ] Дубликат code → 400 error
- [ ] Невалидный code (lowercase) → 400 error
- [ ] Невалидный color → 400 error
- [ ] Несуществующий parentId → 404 error

**Status:** [ ] PASS / [ ] FAIL

---

#### 2.3 GET /api/admin/notification-categories/[id]

**Test:** Получить детали категории

```bash
# Получить ID любой категории
CATEGORY_ID=$(psql -U bogdankononenko -d apricode_dev -t -c "SELECT id FROM \"NotificationEventCategory\" LIMIT 1;" | xargs)

curl -X GET http://localhost:3000/api/admin/notification-categories/$CATEGORY_ID \
  -H "Cookie: your-session-cookie" \
  | jq '.category'
```

**Expected:** Детали категории

**Checklist:**
- [ ] Status 200
- [ ] `success: true`
- [ ] Категория с полными данными
- [ ] Include: parent, children, events, _count

**Status:** [ ] PASS / [ ] FAIL

---

#### 2.4 PATCH /api/admin/notification-categories/[id]

**Test:** Обновить категорию

```bash
CATEGORY_ID=$(psql -U bogdankononenko -d apricode_dev -t -c "SELECT id FROM \"NotificationEventCategory\" WHERE code='TEST_CATEGORY' LIMIT 1;" | xargs)

curl -X PATCH http://localhost:3000/api/admin/notification-categories/$CATEGORY_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "Updated Test Category",
    "color": "#00FF00",
    "sortOrder": 200
  }' | jq '.'
```

**Expected:** Категория обновлена

**Checklist:**
- [ ] Status 200
- [ ] `success: true`
- [ ] Изменения применены

**Protection Tests:**
- [ ] System category name → 403 error
- [ ] Circular parent reference → 400 error
- [ ] Self as parent → 400 error

**Status:** [ ] PASS / [ ] FAIL

---

#### 2.5 DELETE /api/admin/notification-categories/[id]

**Test:** Удалить категорию

```bash
CATEGORY_ID=$(psql -U bogdankononenko -d apricode_dev -t -c "SELECT id FROM \"NotificationEventCategory\" WHERE code='TEST_CATEGORY' LIMIT 1;" | xargs)

curl -X DELETE http://localhost:3000/api/admin/notification-categories/$CATEGORY_ID \
  -H "Cookie: your-session-cookie" \
  | jq '.'
```

**Expected:** Категория удалена (soft delete)

**Checklist:**
- [ ] Status 200
- [ ] `success: true`
- [ ] `isActive = false` в БД

**Protection Tests:**
- [ ] System category → 403 error
- [ ] Category with events → 400 error
- [ ] Category with children → 400 error

**Status:** [ ] PASS / [ ] FAIL

---

### 3. UI Testing - Categories Page

**URL:** `http://localhost:3000/admin/notification-categories`

#### 3.1 Page Load

**Checklist:**
- [ ] Страница загружается без ошибок
- [ ] Stats отображаются (Total: 7, Active: 7, Inactive: 0, System: 7)
- [ ] Список категорий отображается
- [ ] Иконки и цвета корректны
- [ ] Badges (code, system) отображаются

**Status:** [ ] PASS / [ ] FAIL

---

#### 3.2 Create Category Dialog

**Steps:**
1. Нажать "Create Category"
2. Заполнить форму:
   - Code: `UI_TEST`
   - Name: `UI Test Category`
   - Description: `Test from UI`
   - Icon: `Sparkles`
   - Color: выбрать цвет
   - Sort Order: `100`
3. Нажать "Create Category"

**Checklist:**
- [ ] Dialog открывается
- [ ] Все поля доступны
- [ ] Icon picker работает
- [ ] Color picker работает
- [ ] Parent selector работает
- [ ] Validation работает (пустой code → ошибка)
- [ ] Категория создаётся
- [ ] Toast success
- [ ] Список обновляется

**Status:** [ ] PASS / [ ] FAIL

---

#### 3.3 Edit Category Dialog

**Steps:**
1. Нажать ⋮ на категории `UI_TEST`
2. Выбрать "Edit"
3. Изменить:
   - Name: `Updated UI Test`
   - Color: другой цвет
4. Нажать "Update Category"

**Checklist:**
- [ ] Dialog открывается с данными
- [ ] Code disabled (immutable)
- [ ] Изменения сохраняются
- [ ] Toast success
- [ ] Список обновляется
- [ ] System category name disabled

**Status:** [ ] PASS / [ ] FAIL

---

#### 3.4 Toggle Active/Inactive

**Steps:**
1. Нажать ⋮ на категории `UI_TEST`
2. Выбрать "Deactivate"
3. Проверить badge "Inactive"
4. Нажать ⋮ → "Activate"

**Checklist:**
- [ ] Deactivate работает
- [ ] Badge "Inactive" появляется
- [ ] Activate работает
- [ ] Badge исчезает
- [ ] Toast notifications

**Status:** [ ] PASS / [ ] FAIL

---

#### 3.5 Delete Category

**Steps:**
1. Нажать ⋮ на категории `UI_TEST`
2. Выбрать "Delete"
3. Подтвердить

**Checklist:**
- [ ] Confirm dialog появляется
- [ ] Delete работает
- [ ] Toast success
- [ ] Категория исчезает из списка
- [ ] System category → Delete недоступен

**Status:** [ ] PASS / [ ] FAIL

---

### 4. UI Testing - Notification Events Page

**URL:** `http://localhost:3000/admin/notification-events`

#### 4.1 Template Integration (Phase 1.1)

**Steps:**
1. Открыть "Create Event" dialog
2. Выбрать Category: `ORDER`
3. Проверить Template dropdown

**Checklist:**
- [ ] Template dropdown загружается
- [ ] Шаблоны фильтруются по категории
- [ ] Отображается: name, category, status
- [ ] "None" опция доступна
- [ ] Выбор шаблона работает

**Status:** [ ] PASS / [ ] FAIL

---

#### 4.2 Variable Schema (Phase 1.2)

**Steps:**
1. Открыть "Create Event" dialog
2. Прокрутить до "Variables (Payload Schema)"
3. Добавить Required Variable: `orderId`
4. Добавить Optional Variable: `note`
5. Заполнить Example Payload: `{"orderId": "123", "note": "test"}`
6. Заполнить Developer Notes

**Checklist:**
- [ ] Required Variables section отображается
- [ ] Add button работает
- [ ] Badge (синий) создаётся
- [ ] Remove button работает
- [ ] Optional Variables section отображается
- [ ] Add button работает
- [ ] Badge (серый) создаётся
- [ ] Remove button работает
- [ ] Example Payload textarea работает
- [ ] JSON validation работает
- [ ] Developer Notes textarea работает

**Status:** [ ] PASS / [ ] FAIL

---

### 5. Integration Testing

#### 5.1 Category → Events Link

**Test:** Проверить связь категорий и событий

```bash
# Получить категорию с событиями
psql -U bogdankononenko -d apricode_dev -c "
SELECT 
  c.code, 
  c.name, 
  COUNT(e.id) as event_count
FROM \"NotificationEventCategory\" c
LEFT JOIN \"NotificationEvent\" e ON e.\"categoryId\" = c.id
GROUP BY c.id, c.code, c.name
ORDER BY c.\"sortOrder\";
"
```

**Expected:** Все категории с количеством событий

**Checklist:**
- [ ] ORDER: 4 события
- [ ] KYC: 4 события
- [ ] PAYMENT: 3 события
- [ ] SECURITY: 2 события
- [ ] SYSTEM: 2 события
- [ ] ADMIN: 1 событие
- [ ] MARKETING: 1 событие

**Status:** [ ] PASS / [ ] FAIL

---

#### 5.2 Template → Events Link

**Test:** Проверить связь шаблонов и событий

```bash
psql -U bogdankononenko -d apricode_dev -c "
SELECT 
  e.\"eventKey\",
  e.name,
  t.name as template_name
FROM \"NotificationEvent\" e
LEFT JOIN \"EmailTemplate\" t ON e.\"templateId\" = t.id
WHERE e.\"templateId\" IS NOT NULL
LIMIT 5;
"
```

**Expected:** События с привязанными шаблонами

**Status:** [ ] PASS / [ ] FAIL

---

### 6. Error Handling

#### 6.1 API Errors

**Test Cases:**
- [ ] 401: Unauthorized (no session)
- [ ] 403: Forbidden (not SUPER_ADMIN)
- [ ] 404: Not Found (invalid ID)
- [ ] 400: Bad Request (validation error)
- [ ] 500: Server Error (database error)

**Status:** [ ] PASS / [ ] FAIL

---

#### 6.2 UI Errors

**Test Cases:**
- [ ] Network error → Toast error
- [ ] Validation error → Toast error
- [ ] Loading states работают
- [ ] Empty states работают
- [ ] Error boundaries работают

**Status:** [ ] PASS / [ ] FAIL

---

## 📊 Test Summary

**Total Tests:** 25  
**Passed:** [ ]  
**Failed:** [ ]  
**Skipped:** [ ]

**Coverage:**
- Database: [ ]%
- API: [ ]%
- UI: [ ]%
- Integration: [ ]%

---

## 🐛 Issues Found

| # | Severity | Component | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 |          |           |             |        |
| 2 |          |           |             |        |
| 3 |          |           |             |        |

---

## ✅ Sign-off

**Tested by:** _________________  
**Date:** _________________  
**Status:** [ ] APPROVED / [ ] REJECTED  
**Notes:**

---

## 🚀 Next Steps

После успешного тестирования:
1. [ ] Исправить найденные баги
2. [ ] Создать production бэкап
3. [ ] Обновить документацию
4. [ ] Готово к Phase 2 (опционально)

