# KYC Resubmission Implementation Plan

## 📋 Цель
Реализовать функционал повторной отправки документов для KYC на основе официальной документации SumSub

## 🔍 Текущее состояние

### База данных (`KycSession`)
```prisma
model KycSession {
  id                   String        @id @default(cuid())
  userId               String        @unique
  status               KycStatus     @default(PENDING) // PENDING, APPROVED, REJECTED, EXPIRED
  rejectionReason      String?       // ❌ НЕТ reviewRejectType
  webhookData          Json?         // Есть, но не структурировано
  metadata             Json?         // Есть
  applicantId          String?       // ✅ Есть для SumSub
  verificationId       String?       // ✅ Есть (inspectionId)
  kycProviderId        String?       // ✅ Есть
  documents            KycDocument[] // ✅ Есть связь
}
```

### Frontend компоненты
- ✅ `KycStatusCard` - показывает текущий статус
- ✅ `KycFormWizard` - форма для первичной подачи
- ❌ НЕТ компонента для resubmission

### Backend API
- ✅ `/api/kyc/status` - получить статус
- ✅ `/api/kyc/webhook/sumsub` - обработка webhook
- ❌ НЕТ endpoints для resubmission

### SumsubAdapter
- ✅ `verifyWebhookSignature()` - проверка подписи
- ✅ `processWebhook()` - обработка webhook (недавно улучшен)
- ✅ `uploadDocument()` - есть метод для загрузки документов
- ❌ НЕТ метода для получения проблемных документов
- ❌ НЕТ метода для запроса повторной проверки

## 📝 План реализации

### Phase 1: Database Schema Updates
**Цель:** Добавить поля для хранения информации о resubmission

#### 1.1. Добавить поля в KycSession
```prisma
model KycSession {
  // ... existing fields ...
  reviewRejectType     String?       // "RETRY" или "FINAL"
  moderationComment    String?       // Комментарий модератора
  clientComment        String?       // Комментарий для клиента
  rejectLabels         String[]      // Массив меток отклонения
  buttonIds            String[]      // ID кнопок для UI (из SumSub)
  problematicSteps     Json?         // Детали проблемных шагов верификации
  canResubmit          Boolean       @default(false) // Флаг для быстрой проверки
}
```

#### 1.2. Расширить KycDocument
```prisma
model KycDocument {
  // ... existing fields ...
  documentStatus       String?       // "PENDING", "APPROVED", "REJECTED"
  reviewComment        String?       // Комментарий по документу
  resubmittedFor       String?       // ID документа, который заменяет
  attempt              Int           @default(1) // Номер попытки
}
```

### Phase 2: Backend API Endpoints

#### 2.1. GET /api/kyc/resubmission/status
**Назначение:** Получить информацию о возможности resubmission и проблемных документах

**Response:**
```json
{
  "canResubmit": true,
  "reviewRejectType": "RETRY",
  "moderationComment": "The text on your identity document is not clearly visible.",
  "clientComment": "Please upload a clear photo",
  "rejectLabels": ["UNSATISFACTORY_PHOTOS", "SCREENSHOTS"],
  "problematicSteps": {
    "IDENTITY": {
      "reviewResult": {
        "reviewAnswer": "RED",
        "moderationComment": "...",
        "rejectLabels": ["UNSATISFACTORY_PHOTOS"]
      },
      "idDocType": "ID_CARD",
      "documents": [
        {
          "id": "393800000",
          "fileName": "front_side.jpg",
          "idDocSubType": "FRONT_SIDE",
          "uploadedAt": "2024-10-01 16:31:51",
          "reviewComment": "Document is not readable"
        }
      ]
    }
  }
}
```

#### 2.2. POST /api/kyc/resubmission/upload
**Назначение:** Загрузить новый документ

**Request:**
```json
{
  "documentType": "ID_CARD",
  "documentSubType": "FRONT_SIDE",
  "country": "USA",
  "file": "base64..."
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "393900000",
  "message": "Document uploaded successfully"
}
```

#### 2.3. POST /api/kyc/resubmission/request-review
**Назначение:** Запросить повторную проверку после загрузки документов

**Request:**
```json
{
  "sessionId": "clx..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "PENDING",
  "message": "Verification request submitted"
}
```

#### 2.4. GET /api/kyc/resubmission/history
**Назначение:** История попыток верификации

**Response:**
```json
{
  "attempts": [
    {
      "attemptNumber": 1,
      "submittedAt": "2024-01-15 10:00:00",
      "reviewedAt": "2024-01-15 12:00:00",
      "status": "REJECTED",
      "reviewRejectType": "RETRY",
      "reason": "Poor document quality"
    },
    {
      "attemptNumber": 2,
      "submittedAt": "2024-01-16 09:00:00",
      "status": "PENDING"
    }
  ]
}
```

### Phase 3: SumsubAdapter Enhancements

#### 3.1. Добавить метод getProblematicDocuments
```typescript
async getProblematicDocuments(applicantId: string): Promise<any> {
  // GET /resources/applicants/{applicantId}/requiredIdDocsStatus
  // Возвращает детали проблемных документов
}
```

#### 3.2. Добавить метод requestReview
```typescript
async requestReview(applicantId: string): Promise<any> {
  // POST /resources/applicants/{applicantId}/status/pending
  // Переводит заявителя в статус Pending для повторной проверки
}
```

#### 3.3. Улучшить uploadDocument
```typescript
async uploadDocument(
  applicantId: string,
  file: Buffer,
  metadata: {
    idDocType: string;
    idDocSubType?: string;
    country: string;
  }
): Promise<any> {
  // POST /resources/applicants/{applicantId}/info/idDoc
  // Уже есть, но нужно убедиться что работает корректно
}
```

### Phase 4: Frontend Components

#### 4.1. KycResubmissionCard Component
**Расположение:** `src/components/kyc/KycResubmissionCard.tsx`

**Features:**
- Показ комментария модератора (moderationComment)
- Список проблемных документов с описанием проблем
- Upload UI для каждого проблемного документа
- Превью загруженных документов
- Кнопка "Submit for Review" (активна только после загрузки всех)
- История попыток

**UI Structure:**
```tsx
<Card>
  <CardHeader>
    <Alert variant="warning">
      Your KYC was rejected (Resubmission allowed)
    </Alert>
    <div>Moderator Comment: {moderationComment}</div>
  </CardHeader>
  
  <CardContent>
    <Tabs>
      <Tab label="Resubmit Documents">
        {problematicSteps.map(step => (
          <ProblemDocumentCard
            step={step}
            onUpload={handleUpload}
          />
        ))}
        <Button onClick={handleRequestReview}>
          Submit for Review
        </Button>
      </Tab>
      
      <Tab label="History">
        <VerificationAttemptsList attempts={history} />
      </Tab>
    </Tabs>
  </CardContent>
</Card>
```

#### 4.2. ProblemDocumentCard Component
**Расположение:** `src/components/kyc/ProblemDocumentCard.tsx`

**Features:**
- Показ типа документа и проблемы
- FileUpload компонент
- Превью загруженного файла
- Статус загрузки (pending/uploaded/success)

#### 4.3. Интеграция в KycStatusCard
```tsx
// В KycStatusCard.tsx
if (kycSession.status === 'REJECTED' && kycSession.canResubmit) {
  return <KycResubmissionCard kycSession={kycSession} />;
}
```

### Phase 5: Webhook Handler Updates

#### 5.1. Сохранение reviewRejectType
```typescript
// В /api/kyc/webhook/sumsub/route.ts
await prisma.kycSession.update({
  where: { id: session.id },
  data: {
    status: event.status,
    reviewRejectType: event.metadata?.reviewRejectType,
    moderationComment: event.metadata?.reviewResult?.moderationComment,
    clientComment: event.metadata?.reviewResult?.clientComment,
    rejectLabels: event.metadata?.reviewResult?.rejectLabels || [],
    buttonIds: event.metadata?.reviewResult?.buttonIds || [],
    canResubmit: event.metadata?.reviewRejectType === 'RETRY',
    // Сохранить полный payload для анализа
    webhookData: event.metadata
  }
});
```

#### 5.2. Получение проблемных документов
После получения webhook с RETRY, автоматически получить детали:

```typescript
if (event.status === 'rejected' && event.metadata?.reviewRejectType === 'RETRY') {
  const sumsubAdapter = await integrationFactory.getProviderByService('sumsub');
  const problematicDocs = await sumsubAdapter.getProblematicDocuments(event.applicantId);
  
  await prisma.kycSession.update({
    where: { id: session.id },
    data: {
      problematicSteps: problematicDocs
    }
  });
}
```

## 🔒 Безопасность и валидация

### 1. Проверки перед resubmission
```typescript
// Проверить что:
- canResubmit === true
- reviewRejectType === 'RETRY'
- status === 'REJECTED'
- userId совпадает с текущим пользователем
- Не превышен лимит попыток (например, макс 3)
```

### 2. Валидация документов
```typescript
// Проверить:
- Формат файла (jpeg, png, pdf)
- Размер файла (макс 10MB)
- Тип документа соответствует требуемому
```

### 3. Rate limiting
```typescript
// Ограничения:
- Макс 3 попытки в день
- Минимум 5 минут между попытками
```

## 📊 Метрики и аналитика

### Events для отслеживания:
```typescript
- KYC_RESUBMISSION_INITIATED
- KYC_DOCUMENT_REUPLOADED
- KYC_REVIEW_REQUESTED
- KYC_RESUBMISSION_APPROVED
- KYC_RESUBMISSION_REJECTED_AGAIN
```

## 🧪 Тестирование

### 1. Unit Tests
- SumsubAdapter методы
- API endpoints
- Webhook processing

### 2. Integration Tests
- Полный flow resubmission
- Webhook → Frontend update

### 3. Manual Testing (Sandbox)
```bash
# 1. Симулировать RETRY rejection
curl -X POST \
  'https://api.sumsub.com/resources/applicants/{id}/status/testCompleted' \
  -d '{
    "reviewAnswer": "RED",
    "rejectLabels": ["UNSATISFACTORY_PHOTOS"],
    "reviewRejectType": "RETRY",
    "moderationComment": "Please upload a clear photo"
  }'

# 2. Получить проблемные документы
# 3. Загрузить новый документ
# 4. Запросить повторную проверку
# 5. Симулировать GREEN response
```

## 📚 Документация для пользователей

### Help Center Article: "How to Resubmit KYC Documents"
1. Why was my verification rejected?
2. What documents need to be resubmitted?
3. How to take a good photo of your ID
4. How to upload new documents
5. What happens after resubmission?

## 🎯 Success Criteria

1. ✅ Пользователь видит понятное объяснение причины отклонения
2. ✅ Пользователь видит только проблемные документы (не все)
3. ✅ Пользователь может загрузить новые документы
4. ✅ Пользователь может запросить повторную проверку
5. ✅ Система автоматически обрабатывает webhook после повторной проверки
6. ✅ История попыток доступна для просмотра
7. ✅ Админы видят историю resubmissions в админ-панели

## 🚀 Порядок реализации

### Day 1: Database & Backend Foundation
1. ✅ Создать миграцию для новых полей KycSession
2. ✅ Обновить Webhook handler для сохранения reviewRejectType
3. ✅ Добавить методы в SumsubAdapter

### Day 2: API Endpoints
1. ✅ GET /api/kyc/resubmission/status
2. ✅ POST /api/kyc/resubmission/upload
3. ✅ POST /api/kyc/resubmission/request-review
4. ✅ Добавить тесты для endpoints

### Day 3: Frontend Components
1. ✅ Создать KycResubmissionCard
2. ✅ Создать ProblemDocumentCard
3. ✅ Интегрировать в KycStatusCard
4. ✅ Добавить стилизацию и UX

### Day 4: Testing & Polish
1. ✅ Тестирование в Sandbox
2. ✅ Fix bugs
3. ✅ Добавить loading states, error handling
4. ✅ Документация

### Day 5: Production Deploy
1. ✅ Review кода
2. ✅ Deploy миграции БД
3. ✅ Deploy backend
4. ✅ Deploy frontend
5. ✅ Monitor metrics

## 📝 Notes

- FINAL rejection НЕ позволяет resubmission - показать сообщение "Please contact support"
- После 3 RETRY rejections - автоматически конвертировать в FINAL
- Хранить все попытки для аудита
- Уведомлять пользователя по email о результатах повторной проверки

