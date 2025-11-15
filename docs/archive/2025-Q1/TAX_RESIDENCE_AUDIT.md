# Tax Residence Field Audit

## ✅ Текущее состояние

### 1. **Поле в KYC форме:**
- ❌ НЕТ отдельного поля `tax_residence` в базе
- ✅ Есть поле `nationality` (тип: `country`)
- ✅ Есть поле `country` (Country of Residence)

### 2. **Данные в Profile:**
```typescript
Profile {
  nationality: string   // Alpha-3 код (например, "POL", "UKR")
  country: string       // Alpha-3 код (например, "POL", "USA")
}
```

### 3. **Передача в Sumsub (SumsubAdapter.ts:318):**
```typescript
fixedInfo: {
  country: countryAlpha3,        // ← Residence country (from profile.country)
  nationality: countryAlpha3,    // ← Nationality (from profile.nationality)
  taxResidence: countryAlpha3,   // ← Tax residence (SAME as nationality!)
}
```

**Проблема:** Используется `nationality` для `taxResidence`, но должна быть **страна проживания** (`country`).

---

## 📊 Что происходит сейчас

### Пример 1: Украинец, живущий в Польше
```
Форма:
- nationality: UKR (Украина)
- country: POL (Польша)

Отправляется в Sumsub:
- nationality: UKR ✅
- country: POL ✅
- taxResidence: UKR ❌ (должно быть POL!)
```

### Пример 2: Поляк, живущий в Польше
```
Форма:
- nationality: POL
- country: POL

Отправляется в Sumsub:
- nationality: POL ✅
- country: POL ✅
- taxResidence: POL ✅ (случайно правильно)
```

---

## 🐛 Проблема

**Строка 284 в `SumsubAdapter.ts`:**
```typescript
const countryAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
```

Это преобразует `nationality`, но затем использует ЭТО ЖЕ значение для:
- `country` (residence) ❌
- `nationality` ✅
- `taxResidence` ❌

**Должно быть:**
- `country` → из `userData.residenceCountry`
- `nationality` → из `userData.nationality`
- `taxResidence` → из `userData.residenceCountry` (обычно совпадает с residence)

---

## ✅ Решение

### Вариант 1: Использовать residenceCountry (рекомендуется)
```typescript
// Convert BOTH nationality AND residence country
const nationalityAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
const residenceAlpha3 = normalizeCountryCodeForProvider(userData.residenceCountry, 'sumsub');

fixedInfo: {
  country: residenceAlpha3,        // Страна проживания
  nationality: nationalityAlpha3,  // Гражданство
  taxResidence: residenceAlpha3,   // Tax residence = где живешь
}
```

### Вариант 2: Добавить отдельное поле в форму
- Добавить поле `tax_residence` в KYC форму
- Пользователь сам выбирает страну налогового резидентства
- Может отличаться от страны проживания (редко)

---

## 🎯 Рекомендация

**Использовать Вариант 1** (residenceCountry для taxResidence):
- ✅ Не нужно менять форму
- ✅ Правильно для 99% случаев
- ✅ Sumsub ожидает именно это
- ✅ Соответствует требованиям APPLICANT_DATA

**Причина:** Tax residence обычно совпадает с country of residence, а не с nationality.

---

## 📝 Что нужно исправить

**Файл:** `src/lib/integrations/providers/kyc/SumsubAdapter.ts`

**Строки 283-318:** Изменить логику преобразования:

```typescript
// OLD (строка 284):
const countryAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');

// NEW:
const nationalityAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
const residenceAlpha3 = normalizeCountryCodeForProvider(userData.residenceCountry || userData.nationality, 'sumsub');

// ...

fixedInfo: {
  country: residenceAlpha3,          // ← FIX: use residence
  nationality: nationalityAlpha3,    // ← CORRECT
  taxResidence: residenceAlpha3,     // ← FIX: use residence (not nationality!)
}
```

---

## 🧪 Тестирование

После исправления проверить:

1. **Украинец в Польше:**
   - Form: nationality=UKR, country=POL
   - Sumsub: nationality=UKR, country=POL, taxResidence=POL ✅

2. **Поляк в Польше:**
   - Form: nationality=POL, country=POL
   - Sumsub: nationality=POL, country=POL, taxResidence=POL ✅

3. **Американец в США:**
   - Form: nationality=USA, country=USA
   - Sumsub: nationality=USA, country=USA, taxResidence=USA ✅

