# 🔍 Sumsub Personal Info - Анализ проблемы

## ❌ ПРОБЛЕМА: Personal Info не заполняется в Sumsub

---

## 📊 Сравнение: Что требует Sumsub vs Что мы отправляем

### ✅ Что ТРЕБУЕТ Sumsub (из документации):

```json
POST /resources/applicants?levelName=... 
{
  "externalUserId": "user_123",
  "fixedInfo": {
    "firstName": "Fred",
    "lastName": "Ehrig",
    "dob": "1960-07-16",           // YYYY-MM-DD
    "placeOfBirth": "Witzenhausen",
    "country": "DEU",              // ISO-3 (residence)
    "nationality": "DEU",          // ISO-3 (citizenship)
    "gender": "MALE",              // ❗ MALE | FEMALE | X
    "phone": "+49...",             // ❗ ВНУТРИ fixedInfo!
    "tin": "...",                  // Tax ID (optional)
    "addresses": [{
      "country": "DEU",            // ISO-3
      "postCode": "41836",
      "town": "Hückelhoven",
      "street": "Myhlerstraße 40",
      "state": ""
    }]
  }
}
```

### ❌ Что МЫ отправляем (SumsubAdapter.ts:313-328):

```typescript
const bodyObj = {
  externalUserId: externalUserId,
  email: userData.email,           // ❌ НА ВЕРХНЕМ УРОВНЕ (не в fixedInfo)
  phone: userData.phone,           // ❌ НА ВЕРХНЕМ УРОВНЕ (не в fixedInfo)
  fixedInfo: {
    firstName: userData.firstName,
    lastName: userData.lastName,
    dob: userData.dateOfBirth,     // ✅ YYYY-MM-DD
    placeOfBirth: userData.placeOfBirth || undefined,
    country: residenceAlpha3,      // ✅ ISO-3
    nationality: nationalityAlpha3,// ✅ ISO-3
    gender: userData.gender || undefined, // ❌ "M" вместо "MALE"
    taxResidence: residenceAlpha3, // ✅ ISO-3
    addresses: addresses.length > 0 ? addresses : undefined
  }
};
```

---

## 🚨 НАЙДЕННЫЕ ПРОБЛЕМЫ:

### 🔴 КРИТИЧНО #1: Gender формат неправильный

**Мы отправляем:**
```typescript
gender: "M" | "F" | "O"  // ❌ Неправильный формат
```

**Sumsub ожидает:**
```typescript
gender: "MALE" | "FEMALE" | "X"  // ✅ Правильный формат
```

**Где исправить:** `SumsubAdapter.ts:324`

---

### 🔴 КРИТИЧНО #2: Phone в неправильном месте

**Мы отправляем:**
```typescript
{
  phone: userData.phone,  // ❌ На верхнем уровне
  fixedInfo: {
    // phone отсутствует здесь!
  }
}
```

**Sumsub ожидает:**
```typescript
{
  fixedInfo: {
    phone: "+49..."       // ✅ ВНУТРИ fixedInfo
  }
}
```

**Где исправить:** `SumsubAdapter.ts:316` → переместить в fixedInfo

---

### 🟠 СРЕДНЕ #3: Email в неправильном месте

**Мы отправляем:**
```typescript
{
  email: userData.email,  // ❓ На верхнем уровне
  fixedInfo: {
    // email отсутствует здесь
  }
}
```

**Sumsub документация:**
- Email МОЖЕТ быть на верхнем уровне
- НО для Personal Info лучше в fixedInfo

**Рекомендация:** Оставить как есть (работает) или переместить в fixedInfo

---

### 🟡 НИЗКОЕ #4: TIN (Tax ID) отсутствует

**Мы отправляем:**
```typescript
fixedInfo: {
  // tin: отсутствует
}
```

**Sumsub:**
- TIN опционален
- Но если есть - лучше отправить

**Решение:** Добавить поле в Profile и форму (опционально)

---

## 🎯 РЕШЕНИЕ:

### Исправление #1: Gender (КРИТИЧНО!)

**Файл:** `src/lib/integrations/providers/kyc/SumsubAdapter.ts:324`

**ДО:**
```typescript
gender: (userData as any).gender || undefined, // M/F if available
```

**ПОСЛЕ:**
```typescript
// Convert gender format: M → MALE, F → FEMALE, O → X
gender: this.convertGenderForSumsub((userData as any).gender),
```

**Добавить метод:**
```typescript
private convertGenderForSumsub(gender?: string): string | undefined {
  if (!gender) return undefined;
  
  const mapping: Record<string, string> = {
    'M': 'MALE',
    'F': 'FEMALE',
    'O': 'X',
    'MALE': 'MALE',     // Already correct
    'FEMALE': 'FEMALE', // Already correct
    'X': 'X'            // Already correct
  };
  
  return mapping[gender.toUpperCase()];
}
```

---

### Исправление #2: Phone в fixedInfo (КРИТИЧНО!)

**Файл:** `src/lib/integrations/providers/kyc/SumsubAdapter.ts:313-328`

**ДО:**
```typescript
const bodyObj = {
  externalUserId: externalUserId,
  email: userData.email,
  phone: userData.phone,      // ❌ На верхнем уровне
  fixedInfo: {
    // ...
  }
};
```

**ПОСЛЕ:**
```typescript
const bodyObj = {
  externalUserId: externalUserId,
  email: userData.email,      // Можно оставить на верхнем уровне
  fixedInfo: {
    firstName: userData.firstName,
    lastName: userData.lastName,
    dob: userData.dateOfBirth,
    placeOfBirth: (userData as any).placeOfBirth || undefined,
    country: residenceAlpha3,
    nationality: nationalityAlpha3,
    phone: userData.phone,    // ✅ ПЕРЕМЕСТИТЬ СЮДА!
    gender: this.convertGenderForSumsub((userData as any).gender),
    taxResidence: residenceAlpha3,
    addresses: addresses.length > 0 ? addresses : undefined
  }
};
```

---

### Исправление #3: Email в fixedInfo (ОПЦИОНАЛЬНО)

**Вариант 1 (минимальный):** Оставить как есть
- Email на верхнем уровне работает
- Не критично для Personal Info

**Вариант 2 (рекомендуемый):** Переместить в fixedInfo
```typescript
fixedInfo: {
  // ...
  email: userData.email,  // ✅ Добавить здесь
  phone: userData.phone,
  // ...
}
```

---

## 📝 ИТОГОВЫЙ ПРАВИЛЬНЫЙ ЗАПРОС:

```typescript
const bodyObj = {
  externalUserId: externalUserId,
  fixedInfo: {
    firstName: userData.firstName,
    lastName: userData.lastName,
    dob: userData.dateOfBirth,        // "YYYY-MM-DD"
    placeOfBirth: userData.placeOfBirth || undefined,
    country: residenceAlpha3,         // "POL", "DEU", etc.
    nationality: nationalityAlpha3,   // "UKR", "DEU", etc.
    email: userData.email,            // ✅ В fixedInfo
    phone: userData.phone,            // ✅ В fixedInfo
    gender: this.convertGenderForSumsub(userData.gender), // ✅ "MALE"/"FEMALE"/"X"
    taxResidence: residenceAlpha3,
    addresses: addresses.length > 0 ? addresses : undefined
  }
};
```

---

## 🧪 ТЕСТИРОВАНИЕ:

### До исправления:
```json
fixedInfo: {
  "gender": "M",               // ❌ Sumsub не понимает
  // "phone": отсутствует       // ❌ Поле пустое в UI
}
```

### После исправления:
```json
fixedInfo: {
  "gender": "MALE",            // ✅ Sumsub понимает
  "phone": "+48123456789",     // ✅ Отображается в UI
  "email": "user@example.com"  // ✅ Отображается в UI
}
```

---

## ✅ ПРИОРИТЕТ ИСПРАВЛЕНИЙ:

1. **🔴 КРИТИЧНО (сделать СЕЙЧАС):**
   - Gender формат (M → MALE)
   - Phone в fixedInfo

2. **🟠 ВАЖНО (следующий шаг):**
   - Email в fixedInfo

3. **🟡 ОПЦИОНАЛЬНО (можно позже):**
   - Добавить поле TIN

---

## 📊 IMPACT:

### До исправления:
```
Personal Info в Sumsub:
- Name: ✅ Заполнено
- Date of Birth: ✅ Заполнено
- Nationality: ✅ Заполнено
- Gender: ❌ Пусто (неправильный формат)
- Phone: ❌ Пусто (не в fixedInfo)
- Email: ⚠️ Может быть пусто
```

### После исправления:
```
Personal Info в Sumsub:
- Name: ✅ Заполнено
- Date of Birth: ✅ Заполнено
- Nationality: ✅ Заполнено
- Gender: ✅ Заполнено (MALE/FEMALE)
- Phone: ✅ Заполнено
- Email: ✅ Заполнено
```

---

## 🎯 NEXT STEPS:

1. **Добавить метод** `convertGenderForSumsub()` в `SumsubAdapter.ts`
2. **Переместить** `phone` и `email` в `fixedInfo`
3. **Протестировать** создание applicant
4. **Проверить** в Sumsub Dashboard, что Personal Info заполнена

**Готово приступать к исправлению?** ✅

