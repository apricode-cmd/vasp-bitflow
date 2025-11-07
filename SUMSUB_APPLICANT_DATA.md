# Sumsub Applicant Data - Что передается при создании

## 📊 Данные при создании applicant в Sumsub

### **Структура запроса:**

```typescript
POST /resources/applicants?levelName=id-and-liveness

{
  "externalUserId": "cmh83rbwo00009otj1d1lmo9l",  // User ID из БД
  "email": "user@example.com",                     // Email
  "phone": "+48123456789",                         // Телефон
  "fixedInfo": {
    "firstName": "John",                           // Имя из profile.firstName
    "lastName": "Mock-Doe",                        // Фамилия из profile.lastName
    "dob": "1990-01-15",                          // Дата рождения (YYYY-MM-DD)
    "country": "POL"                              // Страна (ISO alpha-3)
  }
}
```

### **Откуда берутся данные:**

| Поле | Источник | Пример |
|------|----------|--------|
| `externalUserId` | `user.id` | `cmh83rbwo00009otj1d1lmo9l` |
| `email` | `user.email` | `john.doe@example.com` |
| `phone` | `user.profile.phoneNumber` | `+48123456789` |
| `firstName` | `user.profile.firstName` | `John` |
| `lastName` | `user.profile.lastName` | `Mock-Doe` |
| `dob` | `user.profile.dateOfBirth` | `1990-01-15` |
| `country` | `user.profile.nationality` | `POL` (alpha-3) |

## 🔍 Проверка текущих данных пользователя

Чтобы увидеть какие данные будут отправлены, проверь логи при создании applicant:

```
📝 Creating Sumsub applicant: {
  email: 'john.doe@example.com',
  externalId: 'cmh83rbwo00009otj1d1lmo9l',
  countryOriginal: 'PL',
  countryConverted: 'POL'
}
```

## 📋 Шаги для проверки:

1. **Удали applicant в Sumsub Dashboard**:
   - Зайди в https://cockpit.sumsub.com
   - Найди applicant с именем "John Mock-Doe"
   - Удали или деактивируй

2. **Очисти KYC session в нашей БД** (опционально):
   ```sql
   DELETE FROM "KycSession" WHERE "userId" = 'cmh83rbwo00009otj1d1lmo9l';
   ```

3. **Создай заново**:
   - Нажми "Start Verification" или сканируй QR
   - Смотри логи сервера
   - Проверь в Sumsub Dashboard

## 🎯 Что проверить в Sumsub Dashboard:

После создания applicant должен появиться с данными:
- ✅ External User ID: `cmh83rbwo00009otj1d1lmo9l`
- ✅ Email: из профиля пользователя
- ✅ Phone: из профиля пользователя
- ✅ Name: `John Mock-Doe` (из `firstName` + `lastName`)
- ✅ DOB: дата рождения из профиля
- ✅ Country: код страны (alpha-3)

## 📝 Логи при создании:

```
🎫 SDK token request from user: cmh83rbwo00009otj1d1lmo9l
ℹ️ KYC session not found, creating new session
📝 Creating Sumsub applicant: { 
  email: 'user@example.com', 
  externalId: 'cmh83rbwo00009otj1d1lmo9l',
  countryOriginal: 'PL',
  countryConverted: 'POL'
}
✅ Sumsub applicant created: 690e681e56f45eb45a8636b5
✅ KYC session created: clxxx...
✅ Sumsub access token created
```

Готов проверить! 🚀
