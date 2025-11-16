# 📧 Недостающие Email Шаблоны

## ✅ Что уже есть (10 шаблонов)

| # | Ключ | Название | Категория | Статус |
|---|------|----------|-----------|--------|
| 1 | `ORDER_CREATED` | Order Created | TRANSACTIONAL | ✅ Готов |
| 2 | `ORDER_COMPLETED` | Order Completed | TRANSACTIONAL | ✅ Готов |
| 3 | `ORDER_CANCELLED` | Order Cancelled | TRANSACTIONAL | ✅ Готов |
| 4 | `PAYMENT_RECEIVED` | Payment Received | TRANSACTIONAL | ✅ Готов |
| 5 | `KYC_APPROVED` | KYC Approved | COMPLIANCE | ✅ Готов |
| 6 | `KYC_REJECTED` | KYC Rejected | COMPLIANCE | ✅ Готов |
| 7 | `WELCOME_EMAIL` | Welcome Email | NOTIFICATION | ✅ Готов |
| 8 | `EMAIL_VERIFICATION` | Email Verification | SYSTEM | ✅ Готов |
| 9 | `PASSWORD_RESET` | Password Reset | SYSTEM | ✅ Готов |
| 10 | `ADMIN_INVITED` | Admin Invitation | SYSTEM | ✅ Готов |

---

## ❌ Что нужно создать (12 шаблонов)

### 📦 Order Templates (4)

| # | Ключ | Название | Приоритет | Время | Описание |
|---|------|----------|-----------|-------|----------|
| 1 | `ORDER_PROCESSING` | Order Processing | 🔥 HIGH | 30 мин | Заказ в обработке, админ начал выполнение |
| 2 | `ORDER_EXPIRED` | Order Expired | 🟡 MEDIUM | 30 мин | Заказ истек (не оплачен вовремя) |
| 3 | `ORDER_FAILED` | Order Failed | 🔥 HIGH | 30 мин | Заказ завершился ошибкой |
| 4 | `ORDER_REFUNDED` | Order Refunded | 🟡 MEDIUM | 30 мин | Возврат средств по заказу |

**Итого:** ~2 часа

---

### 💳 Payment Templates (3)

| # | Ключ | Название | Приоритет | Время | Описание |
|---|------|----------|-----------|-------|----------|
| 5 | `PAYMENT_PENDING` | Payment Pending | 🟡 MEDIUM | 30 мин | Ожидание платежа, инструкции |
| 6 | `PAYMENT_CONFIRMED` | Payment Confirmed | 🔥 HIGH | 30 мин | Платеж подтвержден, идет обработка |
| 7 | `PAYMENT_FAILED` | Payment Failed | 🟡 MEDIUM | 30 мин | Платеж не прошел |

**Итого:** ~1.5 часа

---

### 🔐 KYC Templates (2)

| # | Ключ | Название | Приоритет | Время | Описание |
|---|------|----------|-----------|-------|----------|
| 8 | `KYC_SUBMITTED` | KYC Submitted | 🟢 LOW | 20 мин | KYC отправлен на проверку |
| 9 | `KYC_DOCUMENTS_REQUIRED` | Additional Docs Required | 🟡 MEDIUM | 30 мин | Нужны дополнительные документы |

**Итого:** ~50 минут

---

### 🔒 Security Templates (3)

| # | Ключ | Название | Приоритет | Время | Описание |
|---|------|----------|-----------|-------|----------|
| 10 | `SECURITY_LOGIN` | Login Notification | 🟡 MEDIUM | 30 мин | Уведомление о входе в аккаунт |
| 11 | `SECURITY_PASSWORD_CHANGED` | Password Changed | 🔥 HIGH | 30 мин | Пароль успешно изменен |
| 12 | `SECURITY_SUSPICIOUS_ACTIVITY` | Suspicious Activity | 🟢 LOW | 40 мин | Подозрительная активность |

**Итого:** ~1 час 40 минут

---

## 📊 Статистика

### По категориям:

| Категория | Есть | Нужно | Всего |
|-----------|------|-------|-------|
| ORDER | 3 | 4 | 7 |
| PAYMENT | 1 | 3 | 4 |
| KYC | 2 | 2 | 4 |
| SECURITY | 0 | 3 | 3 |
| USER | 3 | 0 | 3 |
| ADMIN | 1 | 0 | 1 |
| **ИТОГО** | **10** | **12** | **22** |

### По приоритету:

| Приоритет | Количество | Время |
|-----------|------------|-------|
| 🔥 HIGH | 4 | ~2 часа |
| 🟡 MEDIUM | 6 | ~3 часа |
| 🟢 LOW | 2 | ~1 час |
| **ИТОГО** | **12** | **~6 часов** |

---

## 🎯 План создания

### Phase 1: HIGH Priority (2 часа)
1. ✅ `ORDER_PROCESSING` - критично для UX
2. ✅ `ORDER_FAILED` - критично для поддержки
3. ✅ `PAYMENT_CONFIRMED` - основной flow
4. ✅ `SECURITY_PASSWORD_CHANGED` - безопасность

### Phase 2: MEDIUM Priority (3 часа)
5. ✅ `ORDER_EXPIRED` - таймауты
6. ✅ `ORDER_REFUNDED` - возвраты
7. ✅ `PAYMENT_PENDING` - инструкции
8. ✅ `PAYMENT_FAILED` - обработка ошибок
9. ✅ `KYC_DOCUMENTS_REQUIRED` - compliance
10. ✅ `SECURITY_LOGIN` - безопасность

### Phase 3: LOW Priority (1 час)
11. ✅ `KYC_SUBMITTED` - подтверждение
12. ✅ `SECURITY_SUSPICIOUS_ACTIVITY` - мониторинг

---

## 📝 Структура шаблона

Каждый новый шаблон должен включать:

```json
{
  "key": "TEMPLATE_KEY",
  "name": "Template Name",
  "description": "Clear description",
  "category": "TRANSACTIONAL | NOTIFICATION | COMPLIANCE | SYSTEM",
  "subject": "Subject with {{variables}}",
  "preheader": "Preview text",
  "layout": "default",
  "variables": ["var1", "var2", "brandName", "brandLogo", "primaryColor", "supportEmail", "supportPhone"],
  "bodyContent": "<h1>...</h1><p>...</p>"
}
```

### Обязательные white-label переменные:
- `{{brandName}}` - название платформы
- `{{brandLogo}}` - логотип
- `{{primaryColor}}` - основной цвет
- `{{supportEmail}}` - email поддержки
- `{{supportPhone}}` - телефон поддержки

### Стандартные элементы:
1. **Hero heading** - крупный заголовок
2. **Intro text** - краткое описание
3. **Details box** - таблица с деталями (серый фон)
4. **Alert box** - важная информация (цветной фон + border)
5. **CTA button** - кнопка действия (градиент primary)
6. **Help section** - контакты поддержки

---

## 🛠️ Как создать шаблон

### 1. Добавить в `src/lib/email-templates/presets.json`

```json
{
  "key": "ORDER_PROCESSING",
  "name": "Order Processing",
  "description": "Notify user that order is being processed",
  "category": "TRANSACTIONAL",
  "subject": "Order #{{orderId}} is Being Processed - {{brandName}}",
  "preheader": "We are processing your order and will send crypto soon",
  "layout": "default",
  "variables": ["orderId", "userName", "cryptoCurrency", "amount", "orderUrl", "brandName", "brandLogo", "primaryColor", "supportEmail", "supportPhone"],
  "bodyContent": "<h1 style=\"...\">🔄 Processing Your Order</h1>..."
}
```

### 2. Обновить базу данных

```bash
# Запустить скрипт обновления
npx tsx prisma/update-email-templates.ts

# Или пересоздать
npx prisma db seed
```

### 3. Проверить связь с событиями

```sql
SELECT 
  e."eventKey",
  e.name as event_name,
  t.key as template_key,
  t.name as template_name
FROM "NotificationEvent" e
LEFT JOIN "EmailTemplate" t ON e."templateId" = t.id
WHERE e."eventKey" IN (
  'ORDER_PROCESSING',
  'ORDER_EXPIRED',
  'ORDER_FAILED'
  -- и т.д.
);
```

### 4. Протестировать отправку

```typescript
// В коде
await eventEmitter.emit('ORDER_PROCESSING', {
  userId: order.userId,
  recipientEmail: user.email,
  orderId: order.id,
  cryptoCurrency: order.currencyCode,
  amount: order.cryptoAmount,
  orderUrl: `${origin}/orders/${order.id}`,
  userName: user.profile.firstName
});
```

---

## 📧 Примеры шаблонов

### ORDER_PROCESSING (Пример)

**Subject:** `Order #{{orderId}} is Being Processed - {{brandName}}`

**Body:**
- 🔄 Hero: "Processing Your Order"
- Intro: "We are working on your order"
- Details: Order ID, Currency, Amount
- Timeline: 
  - ✅ Payment Received
  - 🔄 Processing (current)
  - ⏳ Sending Crypto
  - ⏳ Completed
- Alert: "This usually takes 30 minutes to 2 hours"
- CTA: "Track Order Status"

---

### PAYMENT_CONFIRMED (Пример)

**Subject:** `Payment Confirmed - Order #{{orderId}} - {{brandName}}`

**Body:**
- ✅ Hero: "Payment Confirmed!"
- Intro: "Your payment has been verified"
- Details: Amount, Payment Method, Transaction Reference
- Next Steps:
  1. Order is now processing
  2. Crypto will be sent to your wallet
  3. You'll receive confirmation email
- Alert: "Estimated completion: 1-2 hours"
- CTA: "View Order Details"

---

### SECURITY_PASSWORD_CHANGED (Пример)

**Subject:** `🔒 Password Changed Successfully - {{brandName}}`

**Body:**
- 🔒 Hero: "Password Changed"
- Intro: "Your password was successfully updated"
- Details: Changed at (timestamp), IP address, Device
- Alert (warning): "If you didn't make this change, contact support immediately"
- CTA: "Review Security Settings"
- Secondary CTA: "Contact Support"

---

## 🚀 Следующие шаги

1. **Создать Phase 1** (HIGH priority) - 2 часа
   - ORDER_PROCESSING
   - ORDER_FAILED
   - PAYMENT_CONFIRMED
   - SECURITY_PASSWORD_CHANGED

2. **Создать Phase 2** (MEDIUM priority) - 3 часа
   - ORDER_EXPIRED
   - ORDER_REFUNDED
   - PAYMENT_PENDING
   - PAYMENT_FAILED
   - KYC_DOCUMENTS_REQUIRED
   - SECURITY_LOGIN

3. **Создать Phase 3** (LOW priority) - 1 час
   - KYC_SUBMITTED
   - SECURITY_SUSPICIOUS_ACTIVITY

4. **Добавить eventEmitter.emit() вызовы** - 2 часа
   - В соответствующих API routes
   - См. NOTIFICATION_SYSTEM_FINAL_REPORT.md

**Общее время: ~8 часов (1 рабочий день)**

---

## 📚 Ссылки

- Существующие шаблоны: `src/lib/email-templates/presets.json`
- База layout: `src/lib/email-templates/base-layout.ts`
- Скрипт обновления: `prisma/update-email-templates.ts`
- Финальный отчет: `NOTIFICATION_SYSTEM_FINAL_REPORT.md`
- Email Provider Guide: `EMAIL_PROVIDER_QUICK_GUIDE.md`

