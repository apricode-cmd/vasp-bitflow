# 🚨 Критическая проблема: НЕТ метода обновления applicant

## ❌ НАЙДЕНА ВТОРАЯ ПРОБЛЕМА!

Помимо неправильного формата данных (gender, phone, email), у нас **отсутствует метод обновления applicant**!

---

## 🔍 Что происходит сейчас:

### Сценарий 1: Первое создание applicant
```
1. User заполняет Profile
2. Нажимает "Start KYC"
3. kyc.service.ts вызывает provider.createApplicant()
4. ✅ Applicant создан с текущими данными
```

### Сценарий 2: User изменил Profile и снова открыл KYC
```
1. User изменил имя/телефон/адрес в Profile
2. Нажимает "Start KYC" снова
3. kyc.service.ts вызывает provider.createApplicant()
4. ❌ Ошибка: "Applicant already exists"
5. ⚠️ Код извлекает старый applicantId из ошибки
6. ❌ НО данные в Sumsub остались СТАРЫМИ!
```

### Сценарий 3: Форма KYC submit с обновленными данными
```
1. User заполнил KYC форму с новыми данными
2. Submit форму
3. Данные сохраняются в нашей БД
4. ❌ НО в Sumsub не обновляются!
```

---

## 📊 Проверка кода:

### ✅ Что У НАС ЕСТЬ:

**Файл:** `src/lib/integrations/categories/IKycProvider.ts`

```typescript
export interface IKycProvider {
  createApplicant(userData: KycUserData): Promise<KycApplicant>; // ✅ Есть
  getApplicant(applicantId: string): Promise<KycApplicant>;       // ✅ Есть
  uploadDocument?(...): Promise<...>;                              // ✅ Есть
  submitForReview?(applicantId: string): Promise<...>;            // ✅ Есть
  
  // ❌ updateApplicant() - ОТСУТСТВУЕТ!!!
}
```

### ❌ Чего НЕТ:

1. **Метод в интерфейсе:** `updateApplicant()`
2. **Реализация в SumsubAdapter:** PATCH запрос
3. **Вызов обновления:** в kyc.service.ts

---

## 🎯 ЧТО ТРЕБУЕТ SUMSUB:

### PATCH для обновления fixedInfo:

```
PATCH https://api.sumsub.com/resources/applicants/{applicantId}/fixedInfo

Headers:
  X-App-Token: <APP_TOKEN>
  X-App-Access-Ts: <ts>
  X-App-Access-Sig: <hmac>
  Content-Type: application/json

Body:
{
  "firstName": "Fred",
  "lastName": "Ehrig",
  "dob": "1960-07-16",
  "placeOfBirth": "Witzenhausen",
  "country": "DEU",          // ISO-3
  "nationality": "DEU",      // ISO-3
  "gender": "MALE",          // ❗ MALE/FEMALE/X
  "phone": "+49...",         // ❗ В fixedInfo
  "email": "fred@example.com", // ❗ В fixedInfo
  "tin": "...",
  "addresses": [{
    "country": "DEU",
    "postCode": "41836",
    "town": "Hückelhoven",
    "street": "Myhlerstraße 40",
    "state": ""
  }]
}
```

---

## ✅ РЕШЕНИЕ:

### Шаг 1: Добавить метод в интерфейс

**Файл:** `src/lib/integrations/categories/IKycProvider.ts`

```typescript
export interface IKycProvider extends IIntegrationProvider {
  // ... existing methods ...
  
  /**
   * Update applicant's fixed info (personal data)
   * Used when user updates profile or KYC form data
   * 
   * @param applicantId - Provider's applicant ID
   * @param userData - Updated user data
   */
  updateApplicant?(applicantId: string, userData: KycUserData): Promise<{
    success: boolean;
    error?: string;
  }>;
}
```

### Шаг 2: Реализовать в SumsubAdapter

**Файл:** `src/lib/integrations/providers/kyc/SumsubAdapter.ts`

```typescript
/**
 * Update applicant's fixedInfo
 */
async updateApplicant(
  applicantId: string, 
  userData: KycUserData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    const path = `/resources/applicants/${applicantId}/fixedInfo`;
    const method = 'PATCH';
    
    // Convert country codes
    const nationalityAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
    const residenceAlpha3 = normalizeCountryCodeForProvider(userData.residenceCountry || userData.nationality, 'sumsub');
    
    if (!nationalityAlpha3 || !residenceAlpha3) {
      throw new Error('Invalid country codes');
    }
    
    // Prepare addresses
    const addresses = [];
    if (userData.address || userData.city || userData.postalCode) {
      addresses.push({
        country: residenceAlpha3,
        postCode: userData.postalCode || undefined,
        town: userData.city || undefined,
        street: userData.address || undefined,
        state: undefined
      });
    }
    
    // Build fixedInfo payload (EXACTLY as Sumsub expects)
    const bodyObj = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      dob: userData.dateOfBirth,              // YYYY-MM-DD
      placeOfBirth: userData.placeOfBirth || undefined,
      country: residenceAlpha3,               // ISO-3
      nationality: nationalityAlpha3,         // ISO-3
      email: userData.email,                  // ✅ IN fixedInfo
      phone: userData.phone,                  // ✅ IN fixedInfo
      gender: this.convertGenderForSumsub(userData.gender), // ✅ MALE/FEMALE/X
      taxResidence: residenceAlpha3,
      addresses: addresses.length > 0 ? addresses : undefined
    };
    
    const body = JSON.stringify(bodyObj);
    const { headers } = this.buildRequest(method, path, body);
    
    console.log('🔄 Updating Sumsub applicant:', {
      applicantId,
      email: userData.email,
      nationality: nationalityAlpha3,
      residence: residenceAlpha3
    });
    
    const response = await fetch(this.baseUrl + path, {
      method: method,
      headers,
      body
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Sumsub update failed:', errorData);
      return {
        success: false,
        error: errorData.description || `Update failed: ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('✅ Applicant updated in Sumsub:', data);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Update applicant error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update applicant'
    };
  }
}

/**
 * Convert gender format for Sumsub
 */
private convertGenderForSumsub(gender?: string): string | undefined {
  if (!gender) return undefined;
  
  const mapping: Record<string, string> = {
    'M': 'MALE',
    'F': 'FEMALE',
    'O': 'X',
    'MALE': 'MALE',
    'FEMALE': 'FEMALE',
    'X': 'X'
  };
  
  return mapping[gender.toUpperCase()];
}
```

### Шаг 3: Исправить createApplicant (одновременно)

**В том же SumsubAdapter.ts, строки 313-328:**

```typescript
const bodyObj = {
  externalUserId: externalUserId,
  // НЕ НУЖНО email и phone на верхнем уровне
  fixedInfo: {
    firstName: userData.firstName,
    lastName: userData.lastName,
    dob: userData.dateOfBirth,
    placeOfBirth: (userData as any).placeOfBirth || undefined,
    country: residenceAlpha3,
    nationality: nationalityAlpha3,
    email: userData.email,                    // ✅ В fixedInfo
    phone: userData.phone,                    // ✅ В fixedInfo
    gender: this.convertGenderForSumsub((userData as any).gender), // ✅ MALE/FEMALE
    taxResidence: residenceAlpha3,
    addresses: addresses.length > 0 ? addresses : undefined
  }
};
```

### Шаг 4: Вызывать обновление в kyc.service.ts

**Файл:** `src/lib/services/kyc.service.ts`, после создания applicant:

```typescript
// Step 1: Create applicant (or update if exists)
let applicant: any;
try {
  applicant = await provider.createApplicant(userData);
  console.log(`✅ Applicant created: ${applicant.applicantId}`);
} catch (error: any) {
  // Check if error is 409 Conflict (applicant already exists)
  if (error.message && error.message.includes('already exists')) {
    console.log('ℹ️ Applicant already exists, extracting ID...');
    
    const match = error.message.match(/already exists[:\s]+([a-f0-9]+)/i);
    
    if (match && match[1]) {
      const existingApplicantId = match[1];
      console.log(`🔄 Updating existing applicant: ${existingApplicantId}`);
      
      // ✅ UPDATE applicant with current data
      if (provider.updateApplicant) {
        const updateResult = await provider.updateApplicant(existingApplicantId, userData);
        if (updateResult.success) {
          console.log('✅ Applicant updated successfully');
        } else {
          console.warn('⚠️ Failed to update applicant:', updateResult.error);
        }
      }
      
      applicant = {
        applicantId: existingApplicantId,
        status: 'existing',
        metadata: {}
      };
    } else {
      throw new Error('Could not extract applicant ID from error');
    }
  } else {
    throw error;
  }
}
```

---

## 🎯 ИТОГО: Три проблемы, три решения

### Проблема #1: Gender формат
**Решение:** Метод `convertGenderForSumsub()` - M → MALE

### Проблема #2: Phone/Email не в fixedInfo
**Решение:** Переместить в fixedInfo при создании И обновлении

### Проблема #3: НЕТ метода обновления
**Решение:** 
1. Добавить `updateApplicant()` в интерфейс
2. Реализовать PATCH в SumsubAdapter
3. Вызывать при конфликте "already exists"

---

## 📊 IMPACT:

### До исправления:
```
1. Создали applicant с данными v1
2. User изменил Profile
3. ❌ В Sumsub остались старые данные v1
4. ❌ Personal Info пустая (неправильный формат)
```

### После исправления:
```
1. Создали applicant с данными v1 (в правильном формате)
2. User изменил Profile
3. ✅ PATCH обновил данные до v2 в Sumsub
4. ✅ Personal Info заполнена корректно
```

---

## 🚀 ПРИОРИТЕТ:

**🔴 КРИТИЧНО - ДЕЛАТЬ СЕЙЧАС:**

1. Добавить `convertGenderForSumsub()` метод
2. Переместить phone/email в fixedInfo при CREATE
3. Добавить метод `updateApplicant()` в интерфейс
4. Реализовать PATCH в SumsubAdapter
5. Вызывать update при "already exists"

**Хочешь, чтобы я сделал все эти исправления сейчас?** 🛠️

