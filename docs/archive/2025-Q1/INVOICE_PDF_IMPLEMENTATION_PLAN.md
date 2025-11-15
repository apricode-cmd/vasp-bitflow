# 📄 PDF Invoice Implementation Plan

## 🎯 Цель
Добавить генерацию PDF счетов (invoices) для заказов с использованием юридической информации компании из настроек системы.

---

## 📊 Анализ текущей архитектуры

### 1. System Settings (SystemSettings)
**Таблица:** `SystemSettings`
**Структура:**
```prisma
model SystemSettings {
  key         String      @id
  value       String
  type        SettingType @default(STRING)
  category    String      @default("general")
  description String?
  isPublic    Boolean     @default(false)
  updatedAt   DateTime    @updatedAt
  updatedBy   String?
}
```

**API:**
- `GET /api/admin/settings` - получить все настройки
- `PATCH /api/admin/settings` - обновить несколько настроек
- `GET /api/admin/settings/[key]` - получить одну настройку
- `PATCH /api/admin/settings/[key]` - обновить одну настройку

**UI:**
- `/admin/settings` - страница настроек с вкладками (Brand, SEO, System)

### 2. Orders Architecture
**Таблица:** `Order`
**Связи:**
- `Order.fiatCurrencyCode` → `BankDetails.currency` (динамическая)
- `Order` → `User` → `Profile`

**Страницы:**
- `/orders/[id]` - детальный просмотр заказа (клиент)
- `/admin/orders` - управление заказами (админ)

### 3. Текущие зависимости
**PDF библиотеки:** НЕТ
**Нужно установить:** `pdfkit` или `jspdf` или `@react-pdf/renderer`

---

## 📋 План внедрения

### Phase 1: Добавление юридических настроек компании

#### 1.1. Добавить новые настройки в SystemSettings
**Категория:** `legal`

**Новые ключи:**
```typescript
{
  // Legal Information
  companyLegalName: string;        // "Apricode Exchange Ltd."
  companyRegistrationNumber: string; // "KRS 0000123456"
  companyTaxNumber: string;        // "PL1234567890" (VAT/NIP)
  companyLicenseNumber: string;    // "VASP-2024-001" (опционально)
  companyAddress: string;          // "ul. Przykładowa 123, 00-001 Warszawa, Poland"
  companyPhone: string;            // "+48 22 123 45 67"
  companyEmail: string;            // "legal@apricode.exchange"
  companyWebsite: string;          // "https://apricode.exchange"
}
```

#### 1.2. Seed данных для legal настроек
**Файл:** `prisma/seed.ts` (обновить)
```typescript
const legalSettings = [
  {
    key: 'companyLegalName',
    value: 'Apricode Exchange Ltd.',
    type: 'STRING',
    category: 'legal',
    description: 'Official registered company name',
    isPublic: false
  },
  // ... остальные поля
];
```

#### 1.3. Обновить UI админ-панели
**Файл:** `src/app/(admin)/admin/settings/page.tsx`

Добавить новую вкладку **"Legal"**:
```tsx
<TabsList>
  <TabsTrigger value="brand">Brand</TabsTrigger>
  <TabsTrigger value="seo">SEO</TabsTrigger>
  <TabsTrigger value="legal">Legal</TabsTrigger> {/* NEW */}
  <TabsTrigger value="system">System</TabsTrigger>
</TabsList>

<TabsContent value="legal">
  {/* Форма с полями юридической информации */}
</TabsContent>
```

---

### Phase 2: Установка и настройка PDF библиотеки

#### 2.1. Выбор библиотеки
**Рекомендация:** `@react-pdf/renderer`
- ✅ React-based (знакомый синтаксис)
- ✅ Работает на сервере (Next.js API routes)
- ✅ Хорошая документация
- ✅ Поддержка кириллицы

**Альтернативы:**
- `pdfkit` - Node.js библиотека (более низкоуровневая)
- `jspdf` - клиентская библиотека

#### 2.2. Установка зависимостей
```bash
npm install @react-pdf/renderer
npm install --save-dev @types/react-pdf
```

---

### Phase 3: Создание PDF Invoice Service

#### 3.1. Создать сервис генерации PDF
**Файл:** `src/lib/services/invoice-pdf.service.ts`

**Структура:**
```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface InvoiceData {
  order: Order & { user: User & { profile: Profile } };
  bankDetails: BankDetails;
  companyInfo: {
    legalName: string;
    registrationNumber?: string;
    taxNumber?: string;
    licenseNumber?: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

class InvoicePDFService {
  async generateInvoice(orderId: string): Promise<Buffer> {
    // 1. Получить данные заказа
    // 2. Получить юридические настройки
    // 3. Получить банковские реквизиты
    // 4. Сгенерировать PDF
    // 5. Вернуть Buffer
  }
  
  private createInvoiceDocument(data: InvoiceData): Document {
    // React-PDF компонент
  }
}
```

#### 3.2. Структура Invoice PDF
```
┌─────────────────────────────────────────────────┐
│ INVOICE #APR-XXX-YYY                            │
│ Date: 2025-11-11                                │
├─────────────────────────────────────────────────┤
│ FROM:                      TO:                  │
│ Apricode Exchange Ltd.     John Doe             │
│ KRS: 0000123456            john@example.com     │
│ NIP: PL1234567890          Warsaw, Poland       │
│ ul. Przykładowa 123                             │
│ 00-001 Warszawa, Poland                         │
├─────────────────────────────────────────────────┤
│ INVOICE DETAILS                                 │
│                                                 │
│ Description          Qty    Price      Total    │
│ ───────────────────────────────────────────────│
│ BTC Purchase         0.5    €50,000    €25,000 │
│ Platform Fee (1.5%)  -      -          €375    │
│ ───────────────────────────────────────────────│
│ TOTAL:                                €25,375   │
├─────────────────────────────────────────────────┤
│ PAYMENT INSTRUCTIONS                            │
│                                                 │
│ Bank: European Bank                             │
│ IBAN: PL61109010140000071219812874              │
│ SWIFT: WBKPPLPP                                 │
│ Reference: APR-XXX-YYY                          │
├─────────────────────────────────────────────────┤
│ Wallet Address:                                 │
│ bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh     │
└─────────────────────────────────────────────────┘
```

---

### Phase 4: API Endpoints для генерации PDF

#### 4.1. Создать API route для генерации invoice
**Файл:** `src/app/api/orders/[id]/invoice/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Проверить авторизацию (пользователь или админ)
  // 2. Проверить владение заказом
  // 3. Сгенерировать PDF
  // 4. Вернуть PDF как Response
  
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`
    }
  });
}
```

#### 4.2. Создать API для админа
**Файл:** `src/app/api/admin/orders/[id]/invoice/route.ts`

(Аналогично, но с проверкой админских прав)

---

### Phase 5: UI Integration

#### 5.1. Добавить кнопку "Download Invoice" на странице заказа
**Файл:** `src/app/(client)/orders/[id]/page.tsx`

```tsx
<Button
  onClick={() => window.open(`/api/orders/${order.id}/invoice`, '_blank')}
  disabled={order.status === 'PENDING'}
>
  <FileText className="w-4 h-4 mr-2" />
  Download Invoice
</Button>
```

**Условия отображения:**
- Только для заказов со статусом: `PROCESSING`, `COMPLETED`
- Скрыто для `PENDING`, `CANCELLED`

#### 5.2. Добавить в админ-панель
**Файл:** `src/app/(admin)/admin/orders/page.tsx`

Добавить действие "Download Invoice" в таблицу заказов.

---

### Phase 6: Email Integration (опционально)

#### 6.1. Отправка invoice по email
**Когда:** При изменении статуса на `COMPLETED`

**Файл:** `src/app/api/admin/orders/[id]/route.ts`

```typescript
if (status === 'COMPLETED') {
  // Генерировать PDF
  const pdfBuffer = await invoicePDFService.generateInvoice(orderId);
  
  // Отправить email с вложением
  await emailService.sendWithAttachment({
    to: order.user.email,
    subject: `Invoice for Order #${order.paymentReference}`,
    template: 'order_completed',
    attachments: [{
      filename: `invoice-${order.paymentReference}.pdf`,
      content: pdfBuffer
    }]
  });
}
```

---

## 🔧 Технические детали

### Обработка опциональных полей
```typescript
// Если поле не заполнено - не показываем его в PDF
const companyInfo = {
  legalName: settings.companyLegalName || 'Apricode Exchange',
  registrationNumber: settings.companyRegistrationNumber, // может быть undefined
  taxNumber: settings.companyTaxNumber,
  licenseNumber: settings.companyLicenseNumber, // опционально
  // ...
};

// В PDF:
{companyInfo.registrationNumber && (
  <Text>Registration: {companyInfo.registrationNumber}</Text>
)}
```

### Кеширование настроек
```typescript
// Использовать существующий settings provider
import { useSettings } from '@/components/providers/settings-provider';

// Или создать отдельный helper
async function getCompanyInfo() {
  const settings = await prisma.systemSettings.findMany({
    where: { category: 'legal' }
  });
  return Object.fromEntries(
    settings.map(s => [s.key, s.value])
  );
}
```

### Безопасность
- ✅ Проверка владения заказом (userId === session.user.id)
- ✅ Админы могут скачивать любые invoices
- ✅ Не показывать чувствительные данные в PDF (пароли, токены)

---

## 📁 Структура файлов

```
src/
├── lib/
│   ├── services/
│   │   ├── invoice-pdf.service.ts       # NEW - генерация PDF
│   │   └── email.ts                     # UPDATE - добавить attachments
│   └── utils/
│       └── pdf-helpers.ts               # NEW - вспомогательные функции
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── invoice/
│   │   │           └── route.ts         # NEW - клиентский endpoint
│   │   └── admin/
│   │       └── orders/
│   │           └── [id]/
│   │               └── invoice/
│   │                   └── route.ts     # NEW - админский endpoint
│   └── (admin)/
│       └── admin/
│           └── settings/
│               └── page.tsx             # UPDATE - добавить Legal tab
└── components/
    └── invoice/
        ├── InvoiceDocument.tsx          # NEW - React-PDF компонент
        └── InvoicePreview.tsx           # NEW - превью (опционально)

prisma/
└── seed.ts                              # UPDATE - добавить legal settings
```

---

## ✅ Чеклист внедрения

### Phase 1: Legal Settings
- [ ] Добавить legal настройки в seed.ts
- [ ] Запустить seed (npm run db:seed)
- [ ] Добавить Legal вкладку в /admin/settings
- [ ] Протестировать сохранение настроек

### Phase 2: PDF Library
- [ ] Установить @react-pdf/renderer
- [ ] Создать тестовый PDF компонент
- [ ] Проверить работу на сервере

### Phase 3: Invoice Service
- [ ] Создать invoice-pdf.service.ts
- [ ] Реализовать generateInvoice()
- [ ] Создать InvoiceDocument компонент
- [ ] Добавить стили (fonts, colors)

### Phase 4: API Endpoints
- [ ] Создать /api/orders/[id]/invoice
- [ ] Создать /api/admin/orders/[id]/invoice
- [ ] Добавить проверки безопасности
- [ ] Протестировать генерацию

### Phase 5: UI Integration
- [ ] Добавить кнопку на /orders/[id]
- [ ] Добавить действие в админ-панель
- [ ] Добавить loading состояния
- [ ] Протестировать скачивание

### Phase 6: Email (опционально)
- [ ] Обновить emailService для attachments
- [ ] Интегрировать с order completion
- [ ] Протестировать отправку

---

## 🧪 Тестирование

### Тестовые сценарии:
1. ✅ Админ заполняет legal настройки
2. ✅ Клиент создает заказ
3. ✅ Админ переводит заказ в COMPLETED
4. ✅ Клиент скачивает invoice
5. ✅ Админ скачивает invoice из админки
6. ✅ Проверка корректности данных в PDF
7. ✅ Проверка опциональных полей (если не заполнены)
8. ✅ Проверка безопасности (другой пользователь не может скачать)

---

## 📊 Оценка времени

- Phase 1: Legal Settings - 2 часа
- Phase 2: PDF Library Setup - 1 час
- Phase 3: Invoice Service - 4 часа
- Phase 4: API Endpoints - 2 часа
- Phase 5: UI Integration - 2 часа
- Phase 6: Email Integration - 2 часа
- Testing & Fixes - 2 часа

**ИТОГО:** ~15 часов

---

## 🚀 Приоритеты

### MVP (Must Have):
1. ✅ Legal settings в админке
2. ✅ Базовая генерация PDF
3. ✅ Кнопка скачивания для клиента
4. ✅ API endpoint с безопасностью

### Nice to Have:
- Email с вложением
- Превью PDF в браузере
- Кастомизация шаблона invoice
- Мультиязычность (EN/PL)

---

## 📝 Примечания

1. **Шрифты:** @react-pdf/renderer поддерживает кириллицу из коробки
2. **Производительность:** Генерация PDF ~200-500ms
3. **Размер файла:** ~50-100KB на invoice
4. **Формат:** A4, portrait
5. **Версионирование:** Сохранять snapshot настроек на момент создания заказа?

