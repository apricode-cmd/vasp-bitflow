# White Label KYC Links - Архитектура и Реализация

## 📋 Анализ Требований

### Текущая Ситуация
**Проблема:** Клиент видит прямые ссылки на Sumsub:
```
https://api.sumsub.com/idensic/websdk/...
```

**Требование:** Ссылки должны быть на домене клиента:
```
https://app.bitflow.biz/kyc/verify/...
```

### Пример от Unibit.cz
```
https://liveness.unibit.cz/_act-jwt-{TOKEN}?redirectLink=...&email=...&phone=...
```

**Структура:**
- `liveness.unibit.cz` - поддомен клиента
- `_act-jwt-{TOKEN}` - JWT токен с зашифрованными данными
- Query параметры: `redirectLink`, `email`, `phone`

---

## 🏗️ Архитектура Решения

### Вариант 1: Proxy Redirect (Рекомендуемый)

**Преимущества:**
- ✅ Простая реализация
- ✅ Не требует изменений в Sumsub
- ✅ Полный контроль над URL
- ✅ Возможность аналитики (tracking)
- ✅ Гибкость для будущих изменений

**Недостатки:**
- ⚠️ Дополнительный редирект (незаметен для пользователя)

**Схема работы:**
```
1. Пользователь получает QR/ссылку: 
   https://app.bitflow.biz/api/kyc/verify/{TOKEN}

2. Наш сервер:
   - Декодирует JWT токен
   - Логирует доступ (аналитика)
   - Редиректит на реальный Sumsub URL

3. Пользователь попадает на Sumsub верификацию
```

### Вариант 2: Sumsub External Link API

**Используя документацию Sumsub:**
```
POST /resources/generate-websdk-external-link/
{
  "levelName": "basic-kyc",
  "userId": "user123",
  "applicantIdentifiers": {
    "email": "user@example.com",
    "phone": "+1234567890"
  },
  "redirect": {
    "successUrl": "https://app.bitflow.biz/kyc/success",
    "failureUrl": "https://app.bitflow.biz/kyc/failure"
  },
  "ttlInSecs": 3600
}
```

**Ответ:**
```json
{
  "link": "https://websdk.sumsub.com/verification/External/AbCdEfGhIjKlMnOpQrStUvWxYz"
}
```

**Проблема:** Ссылка все равно на `websdk.sumsub.com` ❌

### Вариант 3: WebSDK Settings + Custom Domain (Enterprise)

**Из документации Sumsub:**
```json
{
  "domainsToHostWebSDK": [
    "https://app.bitflow.biz"
  ],
  "postVerificationRedirectUrl": "https://app.bitflow.biz/kyc/success"
}
```

**Требует:**
- 🔒 Enterprise план Sumsub
- 🌐 Настройка DNS (CNAME)
- ⚙️ Конфигурация на стороне Sumsub

---

## ✅ Рекомендуемое Решение: Proxy Redirect

### Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│  1. Генерация White Label Ссылки                            │
│                                                              │
│  /api/kyc/mobile-link (наш существующий endpoint)           │
│  ↓                                                           │
│  Получает Sumsub URL: https://api.sumsub.com/...            │
│  ↓                                                           │
│  Создает JWT токен:                                         │
│  {                                                           │
│    userId: "user123",                                        │
│    sessionId: "kyc-session-id",                             │
│    provider: "sumsub",                                       │
│    targetUrl: "https://api.sumsub.com/...",                 │
│    exp: timestamp + 3600                                     │
│  }                                                           │
│  ↓                                                           │
│  Возвращает White Label URL:                                │
│  https://app.bitflow.biz/api/kyc/verify/{JWT_TOKEN}         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  2. Использование Ссылки (QR Code / Mobile)                 │
│                                                              │
│  Пользователь сканирует QR или открывает ссылку            │
│  ↓                                                           │
│  GET /api/kyc/verify/{JWT_TOKEN}                            │
│  ↓                                                           │
│  Сервер:                                                     │
│  - Декодирует JWT                                           │
│  - Проверяет срок действия                                  │
│  - Логирует доступ (аналитика)                              │
│  - Обновляет metadata в KycSession                          │
│  ↓                                                           │
│  HTTP 302 Redirect → https://api.sumsub.com/...             │
│  ↓                                                           │
│  Пользователь попадает на Sumsub верификацию                │
└─────────────────────────────────────────────────────────────┘
```

### Структура JWT Токена

```typescript
interface VerifyTokenPayload {
  // Идентификаторы
  userId: string;           // ID пользователя
  sessionId: string;        // ID KYC сессии
  provider: string;         // "sumsub" или "kycaid"
  
  // Целевой URL
  targetUrl: string;        // Реальный URL провайдера
  
  // Метаданные (опционально)
  email?: string;           // Email пользователя
  phone?: string;           // Телефон пользователя
  
  // Безопасность
  exp: number;              // Timestamp истечения (Unix)
  iat: number;              // Timestamp создания (Unix)
  jti: string;              // Unique token ID
}
```

### Преимущества Решения

1. **Брендинг** 🎨
   - Ссылки выглядят как часть платформы клиента
   - QR коды с доменом клиента

2. **Аналитика** 📊
   - Логирование всех переходов
   - Tracking конверсии QR → Верификация
   - Метрики по времени доступа

3. **Безопасность** 🔒
   - JWT с истечением срока действия
   - Защита от повторного использования (optional)
   - Валидация на стороне сервера

4. **Гибкость** 🔄
   - Можно менять провайдера без изменения ссылок
   - Добавление параметров в будущем
   - A/B тестирование

5. **Простота** ⚡
   - Не требует изменений в Sumsub
   - Не требует Enterprise плана
   - Легко внедрить и поддерживать

---

## 📝 План Реализации

### Этап 1: Создание Proxy Endpoint

**Файл:** `src/app/api/kyc/verify/[token]/route.ts`

```typescript
/**
 * KYC Verification Proxy/Redirect
 * 
 * White-label KYC verification links
 * Example: https://app.bitflow.biz/api/kyc/verify/{token}
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

interface VerifyTokenPayload {
  userId: string;
  sessionId: string;
  provider: string;
  targetUrl: string;
  exp?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  try {
    const token = params.token;
    
    // 1. Decode JWT
    const secret = process.env.NEXTAUTH_SECRET!;
    const payload = jwt.verify(token, secret) as VerifyTokenPayload;
    
    // 2. Log access (analytics)
    await prisma.kycSession.update({
      where: { id: payload.sessionId },
      data: {
        metadata: {
          lastProxyAccess: new Date().toISOString(),
          proxyAccessCount: { increment: 1 }
        }
      }
    });
    
    // 3. Redirect to provider
    return NextResponse.redirect(payload.targetUrl);
    
  } catch (error) {
    // Redirect to KYC page with error
    return NextResponse.redirect(
      new URL('/kyc?error=invalid_link', request.url)
    );
  }
}
```

### Этап 2: Модификация Mobile Link Generation

**Файл:** `src/app/api/kyc/mobile-link/route.ts`

Добавить после получения `mobileUrl` от Sumsub:

```typescript
// Generate white-label proxy URL
const secret = process.env.NEXTAUTH_SECRET!;
const proxyToken = jwt.sign(
  {
    userId,
    sessionId: kycSession.id,
    provider: providerId,
    targetUrl: mobileUrl,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  },
  secret
);

const whitelabelUrl = `${process.env.NEXTAUTH_URL}/api/kyc/verify/${proxyToken}`;

return NextResponse.json({
  success: true,
  mobileUrl: whitelabelUrl,  // Возвращаем white-label URL
  originalUrl: mobileUrl,     // Оригинальный URL (для отладки)
  externalActionId: data.externalActionId
});
```

### Этап 3: Обновление Frontend (QR Code)

**Файл:** `src/app/(client)/kyc/page.tsx`

Никаких изменений не требуется! Frontend уже использует `sumsubMobileUrl` из API.

### Этап 4: Тестирование

1. **Локальное тестирование:**
   ```bash
   # Запустить dev сервер
   npm run dev
   
   # Открыть KYC страницу
   http://localhost:3000/kyc
   
   # Проверить QR код - должен содержать:
   http://localhost:3000/api/kyc/verify/{TOKEN}
   ```

2. **Production тестирование:**
   ```bash
   # QR код должен содержать:
   https://app.bitflow.biz/api/kyc/verify/{TOKEN}
   ```

3. **Проверка редиректа:**
   - Открыть ссылку в браузере
   - Должен произойти редирект на Sumsub
   - Проверить логи в консоли

---

## 🔧 Дополнительные Улучшения

### 1. Аналитика и Tracking

```typescript
// Добавить в metadata KycSession:
{
  proxyStats: {
    totalAccesses: number,
    firstAccess: string,
    lastAccess: string,
    userAgents: string[],
    ipAddresses: string[]
  }
}
```

### 2. Rate Limiting

```typescript
// Защита от злоупотреблений
const accessCount = await getProxyAccessCount(sessionId);
if (accessCount > 10) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  );
}
```

### 3. Custom Query Parameters

```typescript
// Поддержка дополнительных параметров
const targetUrl = new URL(payload.targetUrl);
request.nextUrl.searchParams.forEach((value, key) => {
  targetUrl.searchParams.set(key, value);
});
```

### 4. Webhook для Аналитики

```typescript
// Отправка события в аналитику
await fetch('/api/analytics/track', {
  method: 'POST',
  body: JSON.stringify({
    event: 'kyc_link_accessed',
    userId: payload.userId,
    provider: payload.provider,
    timestamp: new Date().toISOString()
  })
});
```

---

## 🚀 Следующие Шаги

1. ✅ Изучить документацию Sumsub (Done)
2. ✅ Проанализировать текущую архитектуру (Done)
3. ⏳ Создать proxy endpoint
4. ⏳ Модифицировать mobile-link API
5. ⏳ Протестировать локально
6. ⏳ Задеплоить на production
7. ⏳ Проверить с реальным QR кодом

---

## 📚 Ссылки

- [Sumsub WebSDK Documentation](https://docs.sumsub.com/sumsub/docs/websdk-settings)
- [Sumsub External Links API](https://docs.sumsub.com/sumsub/reference/generate-websdk-external-link)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

