# 🔐 Passkey Session Security - Production Standard

## Проблема
После успешной Passkey верификации нужно создать NextAuth сессию БЕЗ compromise безопасности.

## ❌ Небезопасные подходы:
1. `passkeyVerified: true` flag - можно подделать
2. Прямое создание JWT - bypass NextAuth security
3. Передача admin данных в URL - XSS риск

## ✅ Правильный подход (Production-ready):

### Схема: One-Time Authentication Token (OTAT)

```
1. Passkey verified ✓
2. Create OTAT in DB:
   - Random crypto token (32 bytes)
   - AdminId
   - ExpiresAt: 60 seconds
   - UsedAt: null
   
3. Return OTAT to client

4. Client calls NextAuth signIn with:
   - email
   - otat (вместо password)
   
5. NextAuth authorize callback:
   - Находит OTAT в БД
   - Проверяет не использован
   - Проверяет не expired
   - Помечает как использованный
   - Возвращает admin
   
6. OTAT удаляется или помечается used
```

### Преимущества:
✅ OTAT одноразовый (replay protection)
✅ Короткий TTL (60 сек) 
✅ Хранится в БД (не подделать)
✅ Интегрируется с NextAuth нативно
✅ Audit trail (кто когда использовал)

### Таблица БД:

```prisma
model OneTimeAuthToken {
  id        String   @id @default(cuid())
  token     String   @unique
  adminId   String
  admin     Admin    @relation(fields: [adminId], references: [id])
  
  createdAt DateTime @default(now())
  expiresAt DateTime
  usedAt    DateTime?
  usedFrom  String?  // IP address
  
  @@index([token, expiresAt])
  @@index([adminId])
}
```

### Реализация:

1. `/api/admin/passkey/verify`:
   - Верифицирует Passkey
   - Создает OTAT
   - Возвращает `{ token: "..." }`

2. Client:
   - Получает token
   - Вызывает NextAuth signIn({ email, otat: token })

3. `auth-admin.ts` authorize:
   - Принимает credentials с otat
   - Проверяет OTAT в БД
   - Помечает использованным
   - Возвращает admin

### Альтернатива: Passkey provider в NextAuth

```typescript
// auth-admin.ts
providers: [
  Credentials({
    id: 'passkey-verified',
    credentials: {
      email: {},
      verificationToken: {}
    },
    async authorize(credentials) {
      // Validate one-time token
      const otat = await prisma.oneTimeAuthToken.findUnique({
        where: { token: credentials.verificationToken },
        include: { admin: true }
      });
      
      if (!otat || otat.usedAt || otat.expiresAt < new Date()) {
        return null;
      }
      
      // Mark as used
      await prisma.oneTimeAuthToken.update({
        where: { id: otat.id },
        data: { usedAt: new Date() }
      });
      
      return {
        id: otat.admin.id,
        email: otat.admin.email,
        role: otat.admin.role,
        ...
      };
    }
  })
]
```

## 🎯 Что реализуем:

1. Создать OneTimeAuthToken model
2. Обновить /api/admin/passkey/verify
3. Добавить provider в auth-admin.ts
4. Обновить PasskeyLoginButton

