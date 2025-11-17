# 🔐 ADMIN SESSION SYSTEM - КОМПЛЕКСНЫЙ ПЛАН ИСПРАВЛЕНИЙ

## 📊 ТЕКУЩИЕ ПРОБЛЕМЫ

### 1. Current Session не определяется правильно
- ❌ Невозможно разлогинить текущую сессию
- ❌ Флаг `isCurrent` выставляется неправильно
- ❌ Сравниваются разные идентификаторы

### 2. Время сессии не работает
- ❌ `validateAndUpdateSession` ищет по `sessionKey`, но передается `sessionId`
- ❌ Session validation не срабатывает для Passkey (Custom JWT)
- ❌ Idle timeout и max duration не enforc'ятся

### 3. Session ID конфликты
- ❌ **Passkey**: `sessionId` генерируется дважды (в API и при создании записи)
- ❌ **NextAuth**: `sessionId` генерируется дважды (в `signIn` и в `jwt` callback)
- ❌ БД содержит один sessionId, но JWT содержит другой!

---

## 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ

### Passkey Flow (Custom JWT)

**Текущая логика:**

```
1. POST /api/admin/auth/session
   └─> createAdminSession() → создает JWT cookie
   └─> createSessionRecord({ sessionId: crypto.randomUUID() }) ← НОВЫЙ UUID!
       └─> Сохраняет в БД:
           - sessionId: <UUID_1>
           - sessionKey: <UUID_1>  ← ПРОБЛЕМА: должен быть JWT token!
           - sessionToken: <UUID_1>.substring(0, 64)

2. GET /api/admin/sessions
   └─> getAdminSessionData() → читает JWT из cookie
   └─> Ищет session по sessionKey = JWT token ← НЕ НАЙДЕТ!
       (в БД sessionKey = UUID, а не JWT)
   └─> currentSessionId = null
   └─> isCurrent = false для всех сессий!
```

**Проблемы:**
- JWT token НЕ сохраняется в `sessionKey`
- `sessionId` в БД != JWT token
- Custom JWT sessions НЕ валидируются (нет `validateAndUpdateSession`)

### NextAuth Flow (Password+TOTP)

**Текущая логика:**

```
1. signIn callback:
   └─> createSessionRecord({ sessionId: crypto.randomUUID() }) ← UUID_1
       └─> Сохраняет в БД:
           - sessionId: <UUID_1>
           - sessionKey: <UUID_1>

2. jwt callback:
   └─> token.sessionId = crypto.randomUUID() ← UUID_2 (ДРУГОЙ!)

3. session callback:
   └─> validateAndUpdateSession(token.sessionId) ← UUID_2
       └─> Ищет по sessionKey = UUID_2 ← НЕ НАЙДЕТ!
           (в БД sessionKey = UUID_1)
   └─> Session validation fails!

4. GET /api/admin/sessions:
   └─> currentSessionId = token.sessionId (UUID_2)
   └─> Сравнивает с session.sessionId (UUID_1 в БД)
   └─> isCurrent = false для всех сессий!
```

**Проблемы:**
- `sessionId` генерируется ДВАЖДЫ (разные UUID)
- `validateAndUpdateSession` ищет по `sessionKey`, но не находит
- Current session не определяется

---

## ✅ РЕШЕНИЕ

### Архитектурное решение:

1. **Единый идентификатор сессии** - `sessionId` (UUID)
   - Генерируется ОДИН РАЗ при создании сессии
   - Используется для всех операций (lookup, validation, termination)

2. **sessionKey vs sessionId:**
   - `sessionId`: Уникальный UUID для идентификации сессии в БД
   - `sessionKey`: Опциональный внешний ключ (JWT token для Passkey, можно оставить null для NextAuth)

3. **Validation:**
   - `validateAndUpdateSession` ищет по `sessionId` (не `sessionKey`)
   - Работает для обеих систем

4. **Current Session:**
   - Определяется по `sessionId` из JWT payload (NextAuth) или по sessionId из БД (Passkey)

---

## 🛠️ ПЛАН ИСПРАВЛЕНИЙ

### Фаза 1: Исправить создание сессий

#### 1.1. Passkey (Custom JWT) - `/api/admin/auth/session/route.ts`

**Изменения:**
```typescript
// БЫЛО:
await createSessionRecord({
  adminId: otat.admin.id,
  sessionId: crypto.randomUUID(), // ← Генерировали новый UUID
  ...
});

// СТАНЕТ:
// 1. Генерируем sessionId ПЕРЕД созданием JWT
const sessionId = crypto.randomUUID();

// 2. Добавляем sessionId в JWT payload
const token = await new SignJWT({
  adminId: admin.id,
  email: admin.email,
  role: admin.role,
  authMethod: 'PASSKEY',
  sessionId, // ← ВАЖНО!
})...

// 3. Создаем запись в БД с тем же sessionId
await createSessionRecord({
  adminId: otat.admin.id,
  sessionId, // ← ТОТ ЖЕ UUID из JWT
  ...
});
```

**Что это даст:**
- JWT содержит sessionId
- БД содержит тот же sessionId
- Можем найти текущую сессию по sessionId

#### 1.2. Custom JWT Service - `admin-session.service.ts`

**Изменения:**
```typescript
export async function createAdminSession(
  adminId: string,
  authMethod: 'PASSKEY' | 'SSO' | 'EMERGENCY',
  sessionId: string // ← НОВЫЙ ПАРАМЕТР
): Promise<{ success: boolean; error?: string; token?: string }> {
  
  // Добавляем sessionId в JWT
  const token = await new SignJWT({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    authMethod,
    sessionId, // ← ВАЖНО!
  })...
  
  // Возвращаем token для последующего сохранения в sessionKey
  return { success: true, token };
}
```

#### 1.3. NextAuth - `auth-admin.ts`

**Изменения:**
```typescript
// signIn callback:
async signIn({ user, account }) {
  // 1. Генерируем sessionId ОДИН РАЗ
  const sessionId = crypto.randomUUID();
  
  // 2. Сохраняем в user для jwt callback
  (user as any).sessionId = sessionId;
  
  // 3. Создаем запись в БД
  await createSessionRecord({
    adminId: user.id,
    sessionId, // ← ТОТ ЖЕ UUID
    ...
  });
}

// jwt callback:
async jwt({ token, user }) {
  if (user) {
    // Используем существующий sessionId из signIn
    token.sessionId = (user as any).sessionId || token.sessionId;
  }
  return token;
}
```

**Что это даст:**
- `sessionId` генерируется ОДИН РАЗ в `signIn`
- Тот же `sessionId` попадает в JWT через `jwt` callback
- Тот же `sessionId` сохраняется в БД

---

### Фаза 2: Исправить validation

#### 2.1. `validateAndUpdateSession` - `admin-session-tracker.service.ts`

**Изменения:**
```typescript
// БЫЛО:
const session = await prisma.adminSession.findFirst({
  where: {
    sessionKey: sessionId, // ← НЕПРАВИЛЬНО!
    isActive: true,
  },
});

// СТАНЕТ:
const session = await prisma.adminSession.findFirst({
  where: {
    sessionId: sessionId, // ← ПРАВИЛЬНО!
    isActive: true,
  },
});
```

#### 2.2. Добавить validation для Passkey

**Новая функция:**
```typescript
export async function validatePasskeySession(
  jwtToken: string
): Promise<SessionValidationResult> {
  // 1. Декодировать JWT и получить sessionId
  const payload = await jwtVerify(jwtToken, JWT_SECRET);
  const sessionId = payload.sessionId;
  
  // 2. Валидировать через обычную функцию
  return validateAndUpdateSession(sessionId);
}
```

**Вызывать в middleware/layout:**
```typescript
const customSession = await getAdminSessionData();
if (customSession) {
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get('admin-session')?.value;
  
  if (jwtToken) {
    const validation = await validatePasskeySession(jwtToken);
    if (!validation.valid) {
      // Force logout
    }
  }
}
```

---

### Фаза 3: Исправить определение current session

#### 3.1. GET `/api/admin/sessions` - `route.ts`

**Изменения:**
```typescript
// Для Passkey:
if (customSession) {
  adminId = customSession.adminId;
  currentSessionId = customSession.sessionId; // ← sessionId из JWT payload!
}

// Для NextAuth:
else {
  const nextAuthSession = await getAdminSession();
  if (nextAuthSession?.user?.id) {
    adminId = nextAuthSession.user.id;
    currentSessionId = (nextAuthSession.user as any).sessionId; // ← sessionId из JWT
  }
}

// Помечаем текущую сессию:
const sessionsWithCurrent = sessions.map(s => ({
  ...s,
  isCurrent: s.sessionId === currentSessionId // ← Сравниваем sessionId!
}));
```

---

### Фаза 4: Исправить logout текущей сессии

#### 4.1. Passkey Logout

**В UI после успешного DELETE:**
```typescript
if (isCurrent) {
  // Вызываем API для удаления JWT cookie
  await fetch('/api/admin/auth/logout', { method: 'POST' });
  // Redirect
  window.location.href = '/admin/auth/login';
}
```

**Создать `/api/admin/auth/logout/route.ts`:**
```typescript
export async function POST() {
  await destroyAdminSession(); // Удаляет JWT cookie
  return NextResponse.json({ success: true });
}
```

#### 4.2. NextAuth Logout

**В UI после успешного DELETE:**
```typescript
if (isCurrent) {
  // NextAuth logout
  await signOut({ redirect: false });
  window.location.href = '/admin/auth/login';
}
```

---

## 📝 ЧЕКЛИСТ ИЗМЕНЕНИЙ

### Files to modify:

- [ ] `src/app/api/admin/auth/session/route.ts` - передавать sessionId
- [ ] `src/lib/services/admin-session.service.ts` - добавить sessionId в JWT
- [ ] `src/auth-admin.ts` - исправить signIn/jwt callbacks
- [ ] `src/lib/services/admin-session-tracker.service.ts`:
  - [ ] `validateAndUpdateSession` - искать по sessionId
  - [ ] `terminateSession` - искать по sessionId (не sessionKey)
  - [ ] Добавить `validatePasskeySession()`
- [ ] `src/app/api/admin/sessions/route.ts` - исправить определение currentSessionId
- [ ] `src/app/api/admin/sessions/[id]/route.ts` - оставить без изменений (уже работает)
- [ ] `src/app/(admin)/admin/profile/page-client.tsx` - добавить правильный logout

### New files:

- [ ] `src/app/api/admin/auth/logout/route.ts` - для Passkey logout

---

## 🧪 ТЕСТИРОВАНИЕ

### Test Case 1: Passkey Login + Session List
1. Login через Passkey
2. Открыть Profile → Sessions
3. ✅ Текущая сессия должна быть помечена "Current"
4. ✅ Другие сессии (если есть) - без метки

### Test Case 2: Password+TOTP Login + Session List
1. Login через Password+TOTP
2. Открыть Profile → Sessions
3. ✅ Текущая сессия должна быть помечена "Current"

### Test Case 3: Logout Current Session (Passkey)
1. Login через Passkey
2. Открыть Profile → Sessions
3. Нажать Logout на текущей сессии
4. ✅ Должен редиректнуть на login
5. ✅ JWT cookie удален

### Test Case 4: Logout Other Session
1. Login в 2х браузерах
2. В первом браузере удалить сессию второго
3. ✅ Сессия удалена в БД
4. ✅ Второй браузер при следующем запросе → logout

### Test Case 5: Idle Timeout
1. Login через любой метод
2. Установить idleTimeout = 1 минута в настройках
3. Ждать 2 минуты без активности
4. ✅ Следующий запрос → force logout
5. ✅ Session в БД помечена terminated (IDLE_TIMEOUT)

### Test Case 6: Max Duration
1. Login через любой метод
2. Установить maxSessionDuration = 1 час
3. Ждать 61 минуту (с периодической активностью)
4. ✅ Следующий запрос → force logout
5. ✅ Session в БД помечена terminated (MAX_DURATION_EXCEEDED)

---

## 🚀 ПОСЛЕДОВАТЕЛЬНОСТЬ ВНЕДРЕНИЯ

1. **Начать с Фазы 1** - исправить создание сессий
2. **Протестировать** - login должен создавать правильные записи в БД
3. **Фаза 2** - исправить validation
4. **Протестировать** - idle/max timeout должны работать
5. **Фаза 3** - исправить current session
6. **Протестировать** - флаг "Current" должен появиться
7. **Фаза 4** - исправить logout
8. **Протестировать** - logout текущей/другой сессии
9. **Финальное тестирование** - все сценарии

---

## 📌 КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### Schema Changes (if needed):
```prisma
model AdminSession {
  sessionId      String   @unique // ← Убедиться что unique
  sessionKey     String?  @unique // ← Опциональный
  sessionToken   String?  // ← Опциональный (для backwards compat)
  ...
}
```

### JWT Payload Structure:

**Passkey (Custom JWT):**
```json
{
  "adminId": "xxx",
  "email": "xxx",
  "role": "xxx",
  "authMethod": "PASSKEY",
  "sessionId": "uuid-here", // ← ДОБАВИТЬ!
  "iat": 123,
  "exp": 456
}
```

**NextAuth (Password+TOTP):**
```json
{
  "id": "xxx",
  "email": "xxx",
  "role": "xxx",
  "authMethod": "PASSWORD_TOTP",
  "sessionId": "uuid-here", // ← УЖЕ ЕСТЬ, исправить генерацию
  "iat": 123,
  "exp": 456
}
```

---

## ⚠️ BACKWARD COMPATIBILITY

- Существующие сессии в БД могут иметь неправильные sessionId/sessionKey
- После деплоя все админы должны **пере логиниться**
- Опция: добавить миграцию для очистки старых сессий

```sql
-- Опционально: очистить все старые сессии при деплое
UPDATE "AdminSession" SET "isActive" = false, "terminatedAt" = NOW(), "terminationReason" = 'SYSTEM_UPGRADE'
WHERE "isActive" = true;
```

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После всех исправлений:

✅ Current session правильно определяется  
✅ Можно разлогинить текущую сессию  
✅ Можно разлогинить другие сессии  
✅ Idle timeout работает  
✅ Max duration работает  
✅ Session validation срабатывает на каждом запросе  
✅ Passkey и Password+TOTP работают одинаково  

---

**Готов начинать исправления! 🚀**

