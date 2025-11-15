# 🚨 KYC Form - Критическое несоответствие

## Проблема: Админка ≠ Клиентская форма

---

## 📊 Визуализация проблемы:

### В админке `/admin/kyc-fields` есть 10 категорий:

```
✅ personal         → "Personal Identification"
✅ contact          → "Contact Information"
✅ address          → "Residential Address"
✅ documents        → "Identity Documents"
✅ pep_sanctions    → "PEP & Sanctions"
✅ employment       → "Employment"
❌ purpose          → "Purpose of Account"        ← НЕТ в форме!
❌ activity         → "Expected Activity"         ← НЕТ в форме!
❌ funds            → "Source of Funds"           ← НЕТ в форме!
✅ consents         → "Consents & Compliance"
```

---

### В клиентской форме `/kyc` используются только 6 категорий:

**Файл:** `src/app/(client)/kyc/page.tsx:78-83`

```typescript
const STEPS = [
  { id: 1, title: 'Personal Info', 
    categories: ['personal'] },                          // ✅ ШАГ 1
    
  { id: 2, title: 'Contact & Address', 
    categories: ['contact', 'address'] },                // ✅ ШАГ 2
    
  { id: 3, title: 'Compliance Profile', 
    categories: ['documents', 'employment', 'pep_sanctions'] },  // ✅ ШАГ 3
    
  // ❌ Step 4 'Intended Use & Funds' disabled - fields not needed for MVP
  // { id: 4, title: 'Purpose & Funds', 
  //   categories: ['purpose', 'activity', 'funds'] }    // ❌ ЗАКОММЕНТИРОВАН!
];
```

---

## 🔥 Что происходит сейчас:

### Сценарий 1: Админ добавляет поля в категорию `purpose`

```
Admin → /admin/kyc-fields → Add field
  ├─ fieldName: "account_purpose"
  ├─ category: "purpose"          ← Есть в выпадающем списке!
  ├─ isRequired: true
  └─ isEnabled: true
  
  [Save]
```

**Результат:**
- ✅ Поле сохраняется в БД
- ✅ Видно в админке `/admin/kyc-fields`
- ❌ **НЕ ВИДНО пользователю** - нет Step 4!
- ❌ User не может заполнить это поле
- ❌ KYC не пройдет валидацию (если поле required)

---

### Сценарий 2: Админ включает поля в категории `funds`

```
Admin → /admin/kyc-fields → "Source of Funds"
  ├─ Toggle ON: "source_of_funds"
  ├─ Toggle ON: "source_of_wealth"
  └─ Toggle ON: "funds_origin"
  
  [Save]
```

**Результат:**
- ✅ Поля `isEnabled = true` в БД
- ❌ **Пользователь не видит** - категория не в STEPS
- ❌ Confusion: "Почему я включил поля, а их нет?"

---

## 📋 Текущая структура (из кода):

### Админка (10 категорий):
```typescript
// src/app/(admin)/admin/kyc-fields/page.tsx
const categoryNames: Record<string, string> = {
  personal: 'Personal Identification',       // ✅ В форме (Step 1)
  contact: 'Contact Information',            // ✅ В форме (Step 2)
  address: 'Residential Address',            // ✅ В форме (Step 2)
  documents: 'Identity Documents',           // ✅ В форме (Step 3)
  pep_sanctions: 'PEP & Sanctions',          // ✅ В форме (Step 3)
  employment: 'Employment',                  // ✅ В форме (Step 3)
  purpose: 'Purpose of Account',             // ❌ НЕТ в форме
  activity: 'Expected Activity',             // ❌ НЕТ в форме
  funds: 'Source of Funds',                  // ❌ НЕТ в форме
  consents: 'Consents & Compliance'          // ❌ НЕТ в форме (отдельный экран)
};
```

### Клиентская форма (6 категорий в 3 шагах):
```typescript
// src/app/(client)/kyc/page.tsx
const STEPS = [
  { id: 1, categories: ['personal'] },                              // Step 1
  { id: 2, categories: ['contact', 'address'] },                    // Step 2
  { id: 3, categories: ['documents', 'employment', 'pep_sanctions'] }, // Step 3
  // Step 4 ОТСУТСТВУЕТ - purpose, activity, funds не показываются!
];
```

---

## 🎯 Решение #1: Quick Fix (30 минут)

### Добавить Step 4 в клиентскую форму

**Файл:** `src/app/(client)/kyc/page.tsx:78-83`

```typescript
const STEPS = [
  { id: 1, title: 'Personal Info', categories: ['personal'] },
  { id: 2, title: 'Contact & Address', categories: ['contact', 'address'] },
  { id: 3, title: 'Compliance Profile', categories: ['documents', 'employment', 'pep_sanctions'] },
  { id: 4, title: 'Purpose & Funds', categories: ['purpose', 'activity', 'funds'] }, // ✅ РАСКОММЕНТИРОВАТЬ!
];
```

**Плюсы:**
- ✅ Быстро (30 минут)
- ✅ Все категории из админки теперь работают
- ✅ Админ может управлять всеми полями

**Минусы:**
- ❌ Step 4 может быть не нужен для всех клиентов
- ❌ Нельзя включить/выключить Step 4 без code deploy

---

## 🎯 Решение #2: Правильное (из аудита)

### Хранить Steps в БД

**Создать модель `KycFormStep`:**

```prisma
model KycFormStep {
  id          String   @id
  stepNumber  Int
  title       String
  categories  String[]  // JSON: ['purpose', 'activity', 'funds']
  isEnabled   Boolean   @default(true)  // ✅ Можно включить/выключить!
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Seed данные:**
```sql
INSERT INTO "KycFormStep" VALUES
  ('step-1', 1, 'Personal Info', '["personal"]', true),
  ('step-2', 2, 'Contact & Address', '["contact","address"]', true),
  ('step-3', 3, 'Compliance', '["documents","employment","pep_sanctions"]', true),
  ('step-4', 4, 'Purpose & Funds', '["purpose","activity","funds"]', false);  -- Disabled!
```

**Клиентская форма загружает Steps из БД:**
```typescript
// Вместо hardcoded STEPS:
const [steps, setSteps] = useState<Step[]>([]);

useEffect(() => {
  fetch('/api/kyc/form-config').then(res => res.json()).then(data => {
    setSteps(data.steps.filter(s => s.isEnabled));  // Только enabled steps!
  });
}, []);
```

**Админка может управлять:**
- ✅ Включить/выключить Step 4
- ✅ Изменить порядок steps
- ✅ Добавить новые steps
- ✅ Изменить названия

---

## 🔍 Как обнаружить проблемы?

### Проверка несоответствия:

**Запрос в БД:**
```sql
-- Показать категории с enabled полями:
SELECT category, COUNT(*) as enabled_fields
FROM "KycFormField"
WHERE "isEnabled" = true
GROUP BY category
ORDER BY category;
```

**Ожидаемый результат:**
```
category      | enabled_fields
--------------+----------------
personal      | 5
contact       | 3
address       | 4
documents     | 3
pep_sanctions | 7
employment    | 3
purpose       | 2   ← Есть enabled поля, но нет в форме!
activity      | 2   ← Есть enabled поля, но нет в форме!
funds         | 3   ← Есть enabled поля, но нет в форме!
consents      | 3
```

**Любая категория с enabled полями, которой нет в STEPS = проблема!**

---

## 📝 Рекомендуемый порядок действий:

### Вариант A: Quick Fix (для production сейчас)

1. ✅ Раскомментировать Step 4 в `/kyc/page.tsx`
2. ✅ Тестировать форму
3. ✅ Deploy

**Время:** 30 минут  
**Риск:** Низкий

---

### Вариант B: Proper Solution (для долгосрочной гибкости)

1. ✅ Создать migration для `KycFormStep`
2. ✅ Seed default steps
3. ✅ API endpoint `/api/kyc/form-config`
4. ✅ Обновить клиентскую форму (использовать dynamic steps)
5. ✅ Админка для управления steps

**Время:** 2-3 дня  
**Преимущества:** Полная гибкость, no code deploys для изменений

---

## ✅ Что делаем?

**Рекомендую:**
1. **Сейчас:** Quick Fix - раскомментировать Step 4
2. **Потом:** Следовать полному плану из `KYC_SYSTEM_AUDIT.md`

**Готово к имплементации!** 🚀

