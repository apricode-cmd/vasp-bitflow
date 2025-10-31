# 🎯 Comprehensive Admin Auth Fix Plan

## 📊 Текущая ситуация

### Проблема
Passkey verification работает ✅, OTAT создаётся ✅, но **NextAuth session НЕ создаётся** ❌

### Симптомы из логов
```
❌ signInWithOTAT error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
GET /admin/auth/login?error=MissingCSRF 200 in 64ms
```

## 🔍 Root Cause Analysis

### Ошибка 1: Неправильный подход к NextAuth API
**ЧТО МЫ ДЕЛАЛИ НЕПРАВИЛЬНО:**
```typescript
// ❌ НЕПРАВИЛЬНО: Прямой вызов internal endpoint через fetch
const response = await fetch('/api/admin/auth/callback/credentials', {...});
```

**ПОЧЕМУ НЕ РАБОТАЕТ:**
- NextAuth v5 **НЕ предоставляет публичный REST API** для `/callback/*` endpoints
- Эти endpoints - **внутренние**, работают ТОЛЬКО через HTML forms
- При прямом вызове через fetch NextAuth возвращает HTML redirect вместо JSON
- CSRF token нужен ТОЛЬКО для form-based authentication

**ПРАВИЛЬНЫЙ ПОДХОД:**
```typescript
// ✅ ПРАВИЛЬНО: Использовать NextAuth signIn() function
await adminSignIn('credentials', {
  email,
  token,
  redirect: false
});
```

### Ошибка 2: Проблема с `basePath`

**ЧТО ПРОИСХОДИТ:**
```typescript
// src/auth-admin.ts
export const { handlers, signIn: adminSignIn, ... } = NextAuth({
  basePath: '/api/admin/auth', // ✅ Правильно указан
  // ...
});
```

**НО:**
NextAuth v5 `signIn()` функция ТРЕБУЕТ, чтобы:
1. `basePath` был правильно настроен ✅
2. API route был по адресу `/api/admin/auth/[...nextauth]/route.ts` ✅
3. Providers имели правильный `id` ✅

### Ошибка 3: Cookie path problem

**ТЕКУЩАЯ КОНФИГУРАЦИЯ:**
```typescript
cookies: {
  sessionToken: {
    name: 'next-auth.session-token.admin',
    options: {
      path: '/', // ✅ Правильно
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  }
}
```

Это **правильно**, НО нужно убедиться, что:
- Cookie действительно устанавливается после `signIn()`
- Cookie читается при следующем запросе

## ✅ ПРАВИЛЬНОЕ РЕШЕНИЕ

### Шаг 1: Упростить server action ✅ СДЕЛАНО

```typescript
// src/lib/actions/admin-auth.ts
export async function signInWithOTAT(email: string, token: string) {
  try {
    console.log('🔐 Server action: signInWithOTAT for:', email);

    // NextAuth signIn() сам:
    // 1. Вызовет authorize() callback
    // 2. Валидирует OTAT
    // 3. Создаст JWT session
    // 4. Установит session cookie
    await adminSignIn('credentials', {
      email,
      token,
      redirect: false,
    });

    // Проверяем, что session создана
    const session = await getAdminSession();
    if (!session?.user) {
      return { error: 'Failed to create session' };
    }

    console.log('✅ Session created for:', session.user.email);
    return { success: true };

  } catch (error: any) {
    if (error instanceof AuthError) {
      return { error: error.message || 'Invalid credentials' };
    }
    return { error: 'Authentication failed' };
  }
}
```

### Шаг 2: Проверить environment variables

**НЕОБХОДИМО:**
```bash
# .env.local
NEXTAUTH_SECRET="min-32-chars-for-clients-xxxx"
NEXTAUTH_ADMIN_SECRET="min-32-chars-for-admins-yyyy"  # MUST BE DIFFERENT
NEXTAUTH_URL="http://localhost:3000"
```

**ВАЖНО:**
- `NEXTAUTH_ADMIN_SECRET` **ДОЛЖЕН ОТЛИЧАТЬСЯ** от `NEXTAUTH_SECRET`
- Оба должны быть минимум 32 символа
- `NEXTAUTH_URL` должен совпадать с реальным URL

### Шаг 3: Тестирование

1. **Kill all processes** and clear cache:
```bash
killall -9 node 2>/dev/null
rm -rf .next
```

2. **Restart server** on correct port:
```bash
PORT=3000 npm run dev
```

3. **Test flow:**
- Открыть `http://localhost:3000/admin/auth/login` (НЕ 3001!)
- Ввести email
- Нажать "Sign in with Passkey"
- Пройти Passkey auth
- **Ожидаемые логи:**
```
🔐 Server action: signInWithOTAT for: admin@apricode.io
🔐 AUTHORIZE called with: { email: '...', hasToken: true }
🔍 OTAT lookup result: { found: true, usedAt: null, expired: false }
✅ OTAT valid in authorize, marking as used
✅ Returning admin user from authorize: { id: '...', email: '...', role: 'SUPER_ADMIN' }
🔐 Admin session callback: { userId: '...', ... }
🔍 Session after signIn: { hasSession: true, userEmail: '...' }
✅ Session created for: admin@apricode.io
```

### Шаг 4: Debug если НЕ работает

**Если AUTHORIZE не вызывается:**
- Проверь `basePath` в `auth-admin.ts`
- Проверь что API route на `/api/admin/auth/[...nextauth]/route.ts`
- Проверь что provider `id: 'credentials'`

**Если AUTHORIZE вызывается, но session не создаётся:**
- Проверь `NEXTAUTH_ADMIN_SECRET` - должен быть правильным
- Проверь что `authorize()` возвращает user object (НЕ `null`)
- Проверь что `jwt()` callback добавляет данные в token
- Проверь что `session()` callback копирует данные из token в session

**Если session создаётся, но сразу теряется:**
- Проверь cookie `next-auth.session-token.admin` в DevTools
- Проверь что cookie имеет правильный `path: '/'`
- Проверь что middleware НЕ удаляет cookie
- Проверь что `getAdminSession()` читает правильную cookie

## 🎯 Expected Outcome

После исправлений:
1. ✅ Passkey verification работает
2. ✅ OTAT создаётся и валидируется
3. ✅ `authorize()` callback вызывается
4. ✅ `authorize()` возвращает user object
5. ✅ NextAuth создаёт JWT session
6. ✅ Cookie `next-auth.session-token.admin` устанавливается
7. ✅ Редирект на `/admin` происходит
8. ✅ Admin layout читает session
9. ✅ Пользователь авторизован ✨

## 📋 Checklist

- [x] Server action упрощён - использует `adminSignIn()`
- [ ] Environment variables проверены
- [ ] Server перезапущен с чистым кешем
- [ ] Тест пройден успешно
- [ ] Логи показывают правильный flow
- [ ] Session сохраняется между запросами
- [ ] Документация обновлена

---

**NEXT STEPS:**
1. Перезапустить сервер
2. Тестировать login flow
3. Анализировать логи
4. Фиксить оставшиеся проблемы

