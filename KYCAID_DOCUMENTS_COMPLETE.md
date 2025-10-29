# 📄 KYCAID Document Integration - Complete

## ✅ Что реализовано

### 1. **Полная интеграция с KYCAID API для документов**

#### Получение документов (KycaidAdapter)
```typescript
// Один запрос возвращает всё
GET /applicants/{applicant_id}

Response:
{
  "documents": [
    {
      "document_id": "...",
      "type": "PASSPORT" | "SELFIE_IMAGE" | ...,
      "status": "valid",
      "document_number": "FN638360",
      "issue_date": "2018-05-02",
      "expiry_date": "2028-05-02",
      "issuing_authority": "6316",
      "front_side": "https://storage.googleapis.com/...",
      "back_side": "https://storage.googleapis.com/...",
      "portrait": "https://storage.googleapis.com/...",
      "other_side_1/2/3": "https://storage.googleapis.com/...",
      "provider": "MANUAL",
      "created_at": "2025-10-29 20:46:34",
      ...
    }
  ]
}
```

### 2. **Сохранение в базу данных**

#### KycDocument модель (Prisma)
```typescript
model KycDocument {
  id              String   @id @default(cuid())
  kycSessionId    String
  kycSession      KycSession @relation(...)
  
  documentType    String   // "PASSPORT", "SELFIE_IMAGE", etc.
  fileUrl         String?  // URL первого изображения (для превью)
  fileName        String?
  verificationData Json    // Полный объект от KYCAID
  
  uploadedAt      DateTime @default(now())
}
```

#### Что сохраняется в `verificationData`:
```json
{
  "document_id": "2d07b03d1ba9b043d4287589cbb39bbea417",
  "type": "PASSPORT",
  "status": "valid",
  "provider": "MANUAL",
  "document_number": "FN638360",
  "additional_number": null,
  "issue_date": "2018-05-02",
  "expiry_date": "2028-05-02",
  "issuing_authority": "6316",
  "portrait": "https://...",
  "front_side_id": "...",
  "front_side": "https://...",
  "back_side_id": "...",
  "back_side": "https://...",
  "other_side_1_id": "...",
  "other_side_1": "https://...",
  "other_side_2_id": null,
  "other_side_2": null,
  "other_side_3_id": null,
  "other_side_3": null,
  "front_side_size": 351659,
  "back_side_size": 347302,
  "income_sources": [],
  "annual_income": null,
  "transaction_amount": null,
  "transaction_currency": null,
  "transaction_datetime": null,
  "transaction_purpose": null,
  "origin_funds": null,
  "card_number": null,
  "account_number": null,
  "decline_reasons": [],
  "created_at": "2025-10-29 20:46:34",
  "synced_at": "2025-10-29T21:00:00.000Z"
}
```

### 3. **Красивый UI в админ-панели**

#### `/admin/kyc` - KYC Review Sheet

**Секция "Identity Documents":**

✨ **Если документы уже синхронизированы:**
- 📊 Badge с количеством документов
- 🖼️ Grid 2x2 с превью карточками
- 🎨 AspectRatio 16:9 для изображений
- 🏷️ Badge с типом документа (PASSPORT, SELFIE_IMAGE)
- ✅/❌ Badge статуса (valid, invalid)
- 📋 Номер документа, дата выдачи, срок действия
- 👁️ Кнопка "View N images" - открывает все фото в новой вкладке (black background)
- 🔄 Кнопка "Re-sync from KYCAID" для обновления

```tsx
<Card hover:shadow-md>
  <AspectRatio ratio={16/9}>
    <img src={front_side} />
  </AspectRatio>
  <div>
    <Badge>PASSPORT</Badge>
    <Badge>valid</Badge>
    <p>No: FN638360</p>
    <p>Issued: 2018-05-02 • Expires: 2028-05-02</p>
    <Button>View 2 images</Button>
  </div>
</Card>
```

📭 **Если документы еще не синхронизированы:**
- 💬 Текст: "No documents synced yet. Click below to fetch from KYCAID."
- 🔘 Кнопка "Sync Documents from KYCAID"

⏳ **Если статус PENDING:**
- 🚫 Placeholder: "Documents will be available after verification is completed"

### 4. **API Endpoint**

#### POST `/api/admin/kyc/[id]/download-report`
```typescript
// Renamed to /sync-documents semantically

// 1. Fetch from KYCAID
const documents = await provider.getApplicantDocuments(applicantId);

// 2. Save to database
for (const doc of documents) {
  await prisma.kycDocument.upsert({
    where: {
      kycSessionId_documentType: {
        kycSessionId: sessionId,
        documentType: doc.type
      }
    },
    create: {
      kycSessionId: sessionId,
      documentType: doc.type,
      fileUrl: doc.front_side || doc.portrait,
      fileName: `${doc.type}_${doc.document_id}`,
      verificationData: {
        // ... ALL fields from KYCAID
      }
    }
  });
}

// 3. Update session metadata
await prisma.kycSession.update({
  data: {
    metadata: {
      documentsSynced: new Date(),
      documentsCount: syncedCount
    }
  }
});
```

### 5. **Graceful Handling**

✅ **Если документов нет (0):**
- ℹ️ Не ошибка, а info
- 💬 "No documents found yet. Try again in a few minutes."
- 📊 `{ documentsCount: 0, message: "..." }`
- 🔄 Админ может повторить позже

✅ **Если KYCAID недоступен (502):**
- 🚨 "KYCAID service is temporarily unavailable. Please try again later."

✅ **Если API key невалидный (401/403):**
- 🔑 "Invalid KYCAID API credentials. Please check integration settings."

## 📊 Примеры данных

### Паспорт (PASSPORT)
```json
{
  "type": "PASSPORT",
  "status": "valid",
  "document_number": "FN638360",
  "issue_date": "2018-05-02",
  "expiry_date": "2028-05-02",
  "issuing_authority": "6316",
  "portrait": "https://storage.googleapis.com/kycaid/portraits/...",
  "front_side": "https://storage.googleapis.com/kycaid/files/...",
  "back_side": "https://storage.googleapis.com/kycaid/files/..."
}
```

### Селфи с документом (SELFIE_IMAGE)
```json
{
  "type": "SELFIE_IMAGE",
  "status": "valid",
  "front_side": "https://storage.googleapis.com/kycaid/files/...",
  "back_side": "https://storage.googleapis.com/kycaid/files/...",
  "other_side_1": "https://storage.googleapis.com/kycaid/files/...",
  "other_side_2": "https://storage.googleapis.com/kycaid/files/...",
  "other_side_3": "https://storage.googleapis.com/kycaid/files/..."
}
```

## 🎯 User Flow

### Админ workflow:
1. 👤 Админ открывает `/admin/kyc`
2. 📋 Видит список KYC сессий
3. 🔍 Кликает на APPROVED/REJECTED сессию
4. 📄 Sheet открывается с деталями
5. 🔘 Кликает "Sync Documents from KYCAID"
6. ⏳ Toast: "Syncing documents..."
7. ✅ Toast: "Synced 2 documents"
8. 🔄 Страница обновляется
9. 🖼️ Админ видит превью паспорта и селфи
10. 👁️ Кликает "View 2 images" на паспорте
11. 🪟 Открывается новая вкладка со всеми фото

## 🔧 Technical Details

### Optimization
- ✅ **Один запрос** вместо N+1 (раньше: applicant + N × document)
- ✅ **Upsert** для идемпотентности (можно синхронизировать повторно)
- ✅ **Graceful degradation** (no errors when 0 documents)
- ✅ **Image fallback** (placeholder если изображение не загрузилось)

### Security
- 🔒 Admin-only endpoint (`requireRole('ADMIN')`)
- 🔐 KYCAID API key encrypted in database
- 🚫 Sensitive URLs с временными подписями (expires)

### Performance
- ⚡ Images загружаются lazy (AspectRatio с placeholder)
- 🎨 Hover effects для лучшего UX
- 📱 Responsive grid (2 cols на desktop)

## 🎉 Result

✅ **Полная интеграция с KYCAID для документов**
✅ **Красивый современный UI с превью**
✅ **Все данные сохранены в JSON**
✅ **Graceful error handling**
✅ **Идемпотентный sync**
✅ **Admin-friendly workflow**

---

**Tested with real KYCAID data:**
- Applicant ID: `3a9cd7481b90c04c0b2b5bc9c8ef19007ed9`
- Verification ID: `fe35fa0c16ccd04c222ba069a958bd5eb5a1`
- Documents: 2 (PASSPORT + SELFIE_IMAGE)
- All images synced successfully ✅

