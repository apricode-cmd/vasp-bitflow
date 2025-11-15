# Verification ID Fix - Sumsub KYC Integration

## 🐛 Проблема

При каждом обновлении страницы KYC создавался новый applicant в Sumsub из-за:

1. **`verificationId` не сохранялся** в базе данных при создании KYC session
2. **Mobile link API** не использовал существующий `applicantId` из БД, а всегда пытался создать новый
3. **Retry logic** для deactivated applicants создавал множество дубликатов с суффиксами `-timestamp-random`
4. **В админке не отображался** `Verification ID` из-за использования legacy полей

## ✅ Решение

### 1. Сохранение `verificationId` при создании KYC session

**Файл:** `src/app/api/kyc/sdk-token/route.ts`

```typescript
// Save KYC session (for Sumsub, applicantId === verificationId)
kycSession = await prisma.kycSession.create({
  data: {
    userId: user.id,
    kycProviderId: provider.providerId,
    applicantId: applicant.applicantId,
    verificationId: applicant.applicantId, // ✅ Теперь сохраняется!
    status: 'PENDING',
    metadata: {
      applicant: applicant.metadata
    } as any
  }
});
```

**Важно:** Для Sumsub `verificationId === applicantId` (это одно и то же значение).

---

### 2. Использование существующего `applicantId` в Mobile Link API

**Файл:** `src/app/api/kyc/mobile-link/route.ts`

**Было:**
```typescript
const requestBody = {
  levelName,
  userId: userId, // ❌ Всегда использовался внутренний userId
  ttlInSecs: 3600
};
```

**Стало:**
```typescript
// 4. Check if KYC session exists and get applicantId
const kycSession = await prisma.kycSession.findUnique({
  where: { userId }
});

// Use existing applicantId if available, otherwise use userId
const externalUserId = kycSession?.applicantId || userId;

console.log('🔍 KYC Session:', {
  exists: !!kycSession,
  applicantId: kycSession?.applicantId || 'N/A',
  usingId: externalUserId
});

const requestBody = {
  levelName,
  userId: externalUserId, // ✅ Используем существующий applicantId!
  ttlInSecs: 3600
};
```

---

### 3. Удаление retry logic для deactivated applicants

**Было:** При получении `404 Applicant is deactivated` API пытался создать новый applicant с суффиксом до 3 раз.

**Стало:** Показываем понятную ошибку пользователю:

```typescript
if (response.status === 404 && errorText.includes('deactivated')) {
  console.error('⚠️ Applicant is deactivated:', externalUserId);
  return NextResponse.json(
    { 
      error: 'Your verification session has been deactivated. Please contact support to restart the verification process.',
      code: 'APPLICANT_DEACTIVATED'
    },
    { status: 400 }
  );
}
```

**Причина:** Если applicant деактивирован в Sumsub, это требует ручного вмешательства администратора. Создание новых applicants автоматически - это обход системы безопасности.

---

### 4. Обновление админки для отображения `Verification ID`

**Файл:** `src/app/(admin)/admin/kyc/page.tsx`

#### a) Обновлен интерфейс `KycSession`:

```typescript
interface KycSession {
  id: string;
  userId: string;
  status: KycStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  kycProviderId: string | null; // ✅ Universal: which KYC provider
  applicantId: string | null; // ✅ Universal: applicant ID
  verificationId: string | null; // ✅ Universal: verification ID
  kycaidVerificationId: string | null; // Legacy KYCAID field
  kycaidApplicantId: string | null; // Legacy KYCAID field
  metadata?: any;
  // ... rest of fields
}
```

#### b) Обновлена колонка таблицы:

```typescript
{
  accessorKey: 'verificationId',
  header: 'Verification ID',
  cell: ({ row }) => {
    // Use universal verificationId, fallback to legacy kycaidVerificationId
    const verificationId = row.original.verificationId || row.original.kycaidVerificationId;
    return verificationId ? (
      <Badge variant="outline" className="font-mono text-xs">
        {verificationId.slice(0, 8)}...
      </Badge>
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    );
  },
}
```

#### c) Обновлен детальный Sheet:

```typescript
{(selectedSession.verificationId || selectedSession.kycaidVerificationId) && (
  <>
    <Separator className="my-4" />
    <div className="space-y-3 text-sm">
      {/* KYC Provider */}
      {selectedSession.kycProviderId && (
        <div>
          <p className="text-muted-foreground">KYC Provider</p>
          <Badge variant="outline" className="mt-1">
            {selectedSession.kycProviderId.toUpperCase()}
          </Badge>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-muted-foreground">Verification ID</p>
          <p className="font-mono text-sm">
            {selectedSession.verificationId || selectedSession.kycaidVerificationId}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Applicant ID</p>
          <p className="font-mono text-sm">
            {selectedSession.applicantId || selectedSession.kycaidApplicantId || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  </>
)}
```

---

## 🎯 Результат

### До исправления:
- ❌ `verificationId` был `NULL` в БД
- ❌ Каждый запрос mobile link создавал новый applicant
- ❌ В Sumsub накапливались дубликаты: `userId-1762556830943-qwxy3`, `userId-1762556831234-abc12`, и т.д.
- ❌ В админке не отображался `Verification ID`

### После исправления:
- ✅ `verificationId` сохраняется при создании KYC session
- ✅ Mobile link использует существующий `applicantId` из БД
- ✅ Не создаются дубликаты applicants
- ✅ В админке отображается `Verification ID` и `KYC Provider`
- ✅ Понятная ошибка если applicant деактивирован

---

## 📊 Проверка в БД

```sql
SELECT 
  "id", 
  "userId", 
  "kycProviderId", 
  "applicantId", 
  "verificationId", 
  "status", 
  "createdAt", 
  "updatedAt" 
FROM "KycSession" 
WHERE "userId" = 'cmh83rbwo00009otj1d1lmo9l';
```

**Ожидаемый результат:**
```
kycProviderId: "sumsub"
applicantId: "690e681e56f45eb45a8636b5"
verificationId: "690e681e56f45eb45a8636b5"  ✅ (равны для Sumsub)
```

---

## 🔍 Проверка в Sumsub Dashboard

1. Зайти в [Sumsub Dashboard](https://cockpit.sumsub.com/)
2. Открыть **Applicants**
3. Найти applicant по `externalUserId` (наш внутренний `userId`)
4. Проверить что **только один** applicant существует для этого пользователя
5. `Applicant ID` должен совпадать с `verificationId` в нашей БД

---

## 🚀 Следующие шаги

1. ✅ Протестировать создание нового KYC session
2. ✅ Проверить что `verificationId` сохраняется
3. ✅ Проверить что QR код ведет на существующий applicant
4. ✅ Проверить что в админке отображается `Verification ID`
5. ⏳ Протестировать полный flow: регистрация → KYC → approval

---

## 📝 Commit

```
fix: Ensure verificationId is saved and prevent duplicate applicant creation

- Save verificationId in KYC session (equal to applicantId for Sumsub)
- Use existing applicantId from DB in mobile-link API instead of creating new ones
- Remove retry logic for deactivated applicants (show error to user instead)
- Update admin KYC page to display universal verificationId/applicantId fields
- Add kycProviderId badge in admin KYC details
- Clean up temporary test scripts
```

**Commit hash:** `4451449`

---

**Дата:** 2025-11-07  
**Статус:** ✅ Исправлено и протестировано

