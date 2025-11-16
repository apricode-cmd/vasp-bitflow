# 🔐 Admin Session System Audit

**Date**: 2025-11-16  
**Status**: 🔴 **CRITICAL SECURITY ISSUE**  
**Priority**: **HIGH**

---

## 📊 Executive Summary

The admin session management system has a **critical security vulnerability**: sessions are stored only in JWT cookies (30-day expiration) without any database tracking. This means:

- ❌ Session timeouts from `AdminSettings` are **completely ignored**
- ❌ No idle timeout enforcement (default: 15 minutes)
- ❌ No maximum session duration enforcement (default: 8 hours)
- ❌ Admins can remain logged in for **30 days** without any activity
- ❌ No centralized session revocation or monitoring

---

## 🔍 Current Implementation Analysis

### 1. Database Schema (Correct)

```prisma
model AdminSession {
  id                String    @id @default(cuid())
  adminId           String
  sessionId         String    @unique
  sessionToken      String    @unique
  sessionKey        String
  ipAddress         String
  deviceType        String?
  browser           String?
  os                String?
  userAgent         String
  country           String?
  city              String?
  mfaMethod         String?
  mfaVerifiedAt     DateTime?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  lastActivity      DateTime  @default(now())  // ⚠️ Should be updated on every request
  expiresAt         DateTime                    // ⚠️ Should be checked on every request
  idleTimeout       Int?                        // ⚠️ Minutes of inactivity allowed
  maxDuration       Int?                        // ⚠️ Maximum session lifetime (hours)
  terminatedAt      DateTime?
  terminatedBy      String?
  terminationReason String?
  updatedAt         DateTime  @updatedAt
  admin             Admin     @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminSettings {
  id                  String   @id @default(cuid())
  adminId             String?  @unique
  sessionTimeout      Int      @default(30)      // ⚠️ Not enforced
  idleTimeout         Int      @default(15)      // ⚠️ Not enforced
  maxSessionDuration  Int      @default(8)       // ⚠️ Not enforced
  // ... other fields
}
```

✅ Schema is **correctly designed** with all necessary fields.

---

### 2. Current Implementations (Incomplete)

#### 🔹 NextAuth JWT (`src/auth-admin.ts`)

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days ⚠️ TOO LONG
  updateAge: 24 * 60 * 60,   // Update once per day
},

callbacks: {
  async session({ session, token }) {
    // TODO: Check session validity (idle + max duration) ⚠️ NOT IMPLEMENTED
    // await checkAdminSessionValidity(token.sessionToken);
    return session;
  }
}
```

**Problems:**
- ❌ Sessions never expire based on activity
- ❌ No database record of sessions
- ❌ No enforcement of `idleTimeout` or `maxSessionDuration`
- ❌ 30-day JWT exp is the ONLY check

#### 🔹 Custom JWT (`src/lib/services/admin-session.service.ts`)

```typescript
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days ⚠️ TOO LONG

export async function createAdminSession(
  adminId: string,
  authMethod: 'PASSKEY' | 'SSO' | 'EMERGENCY'
): Promise<{ success: boolean; error?: string }> {
  // ... Creates JWT cookie ...
  
  // ❌ MISSING: Create record in AdminSession table!
  // ❌ MISSING: Set expiresAt based on AdminSettings
  // ❌ MISSING: Track lastActivity
}
```

**Problems:**
- ❌ No database record created
- ❌ No session tracking
- ❌ No idle timeout enforcement

---

### 3. Middleware (`src/middleware.ts`)

```typescript
// === ADMIN ROUTES (PROTECTED) ===
if (path.startsWith('/admin')) {
  // Skip auth check in middleware - it's handled in server layout
  return NextResponse.next();
}
```

**Problems:**
- ❌ No session activity update
- ❌ No idle timeout check
- ❌ Auth check delegated to layout (correct pattern, but layout also doesn't update activity)

---

## 🔴 Database Audit Results

```bash
📊 AdminSession Stats:
Total sessions: 0        # ⚠️ EMPTY TABLE!

📋 AdminSettings timeouts:
{
  "sessionTimeout": 30,       # Minutes - NOT ENFORCED
  "idleTimeout": 15,          # Minutes - NOT ENFORCED
  "maxSessionDuration": 8     # Hours - NOT ENFORCED
}
```

**Conclusion**: The `AdminSession` table exists but is **never used**.

---

## 🚨 Security Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Long-lived sessions** | 🔴 **CRITICAL** | Admins can stay logged in for 30 days without activity |
| **No idle timeout** | 🟠 **HIGH** | Unattended admin terminals remain authenticated |
| **No max session duration** | 🟠 **HIGH** | No forced re-authentication after max lifetime |
| **No session monitoring** | 🟡 **MEDIUM** | Cannot track active admin sessions or device usage |
| **No centralized revocation** | 🟡 **MEDIUM** | Cannot force-logout compromised admin accounts |
| **Compliance violations** | 🟠 **HIGH** | Fails PSD2/SCA, DORA, SOC2, ISO 27001 requirements |

---

## ✅ Required Fixes

### Phase 1: Database Session Tracking (CRITICAL)

**1. Update `createAdminSession` service**
```typescript
// src/lib/services/admin-session.service.ts

export async function createAdminSession(
  adminId: string,
  authMethod: 'PASSKEY' | 'SSO' | 'EMERGENCY',
  request: NextRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: { settings: true }
    });

    if (!admin) return { success: false, error: 'Admin not found' };
    if (!admin.isActive || admin.isSuspended) {
      return { success: false, error: 'Admin account is not active' };
    }

    // Get settings (with defaults)
    const settings = admin.settings || {
      idleTimeout: 15,      // 15 minutes default
      maxSessionDuration: 8  // 8 hours default
    };

    // Calculate expiration based on settings (NOT 30 days!)
    const now = new Date();
    const maxDurationMs = settings.maxSessionDuration * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + maxDurationMs);

    // Create JWT (short-lived, based on maxSessionDuration)
    const sessionId = crypto.randomUUID();
    const token = await new SignJWT({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      authMethod,
      sessionId, // Link to DB record
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET);

    // ✅ CREATE DATABASE RECORD
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionId,
        sessionToken: token.substring(0, 64), // Store hash or prefix
        sessionKey: sessionId,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        deviceType: detectDeviceType(request.headers.get('user-agent')),
        browser: detectBrowser(request.headers.get('user-agent')),
        os: detectOS(request.headers.get('user-agent')),
        country: request.geo?.country || null,
        city: request.geo?.city || null,
        mfaMethod: authMethod === 'PASSKEY' ? 'PASSKEY' : null,
        mfaVerifiedAt: authMethod === 'PASSKEY' ? now : null,
        isActive: true,
        createdAt: now,
        lastActivity: now,
        expiresAt,
        idleTimeout: settings.idleTimeout,
        maxDuration: settings.maxSessionDuration,
      },
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxDurationMs / 1000, // Use actual maxDuration
    });

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: now },
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to create admin session:', error);
    return { success: false, error: 'Failed to create session' };
  }
}
```

**2. Add session validation middleware**
```typescript
// src/lib/middleware/validate-admin-session.ts

export async function validateAdminSession(
  sessionData: AdminSessionData
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Get session from DB
    const session = await prisma.adminSession.findFirst({
      where: {
        adminId: sessionData.adminId,
        sessionKey: sessionData.sessionId,
        isActive: true,
      },
    });

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    const now = new Date();

    // Check if session expired
    if (session.expiresAt < now) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          terminatedAt: now,
          terminationReason: 'MAX_DURATION_EXCEEDED',
        },
      });
      return { valid: false, reason: 'Session expired (max duration)' };
    }

    // Check idle timeout
    const idleTimeoutMs = (session.idleTimeout || 15) * 60 * 1000;
    const lastActivityTime = session.lastActivity.getTime();
    const timeSinceActivity = now.getTime() - lastActivityTime;

    if (timeSinceActivity > idleTimeoutMs) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          terminatedAt: now,
          terminationReason: 'IDLE_TIMEOUT',
        },
      });
      return { valid: false, reason: 'Session expired (idle timeout)' };
    }

    // ✅ Session valid - UPDATE lastActivity
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActivity: now },
    });

    return { valid: true };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, reason: 'Validation error' };
  }
}
```

**3. Update NextAuth callbacks**
```typescript
// src/auth-admin.ts

callbacks: {
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role;
      session.user.authMethod = token.authMethod as string;

      // ✅ CHECK SESSION VALIDITY
      const validation = await validateAdminSession({
        adminId: token.id as string,
        sessionId: token.sessionId as string,
        email: token.email as string,
        role: token.role as string,
        authMethod: token.authMethod as string,
        iat: token.iat as number,
        exp: token.exp as number,
      });

      if (!validation.valid) {
        // Force logout by returning null
        console.warn(`❌ Invalid admin session: ${validation.reason}`);
        return null as any; // NextAuth will treat this as logged out
      }
    }
    return session;
  }
}
```

---

### Phase 2: Admin Dashboard Features

**1. Active Sessions Page**
- Show all active sessions for current admin
- Display: Device, Browser, Location, Last Activity
- Allow manual session termination

**2. System Admin: Session Management**
- View all active admin sessions
- Filter by admin, role, location
- Force-terminate suspicious sessions
- Session analytics (duration, activity patterns)

**3. Security Alerts**
- Email notification on new device login
- Alert on suspicious session (new location, device)
- Configurable alert thresholds

---

## 📈 Compliance Benefits

| Standard | Requirement | How This Fixes It |
|----------|-------------|-------------------|
| **PSD2/SCA** | Re-authentication after inactivity | ✅ Idle timeout enforcement |
| **DORA** | Session monitoring and termination | ✅ Database tracking + revocation |
| **SOC 2** | Access control logging | ✅ Session audit trail |
| **ISO 27001** | Automatic session termination | ✅ Max duration + idle timeout |
| **GDPR** | Minimize data exposure risk | ✅ Shorter session lifetimes |

---

## 🎯 Recommended Timeline

| Phase | Task | Priority | Effort | Status |
|-------|------|----------|--------|--------|
| **1** | Implement database session tracking | 🔴 CRITICAL | 4-6h | ❌ TODO |
| **1** | Add session validation middleware | 🔴 CRITICAL | 2-3h | ❌ TODO |
| **1** | Update auth callbacks | 🔴 CRITICAL | 1-2h | ❌ TODO |
| **2** | Build Active Sessions UI | 🟠 HIGH | 3-4h | ❌ TODO |
| **2** | Add session revocation API | 🟠 HIGH | 2h | ❌ TODO |
| **2** | Security alerts system | 🟡 MEDIUM | 4-6h | ❌ TODO |
| **3** | Analytics & monitoring | 🟢 LOW | 6-8h | ❌ TODO |

**Total effort**: ~22-31 hours (3-4 days)

---

## 🚀 Quick Fix (Immediate)

**Until full implementation, reduce JWT maxAge:**

```typescript
// src/auth-admin.ts
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60, // 8 hours instead of 30 days
  updateAge: 15 * 60,  // Update every 15 minutes
},
```

**This reduces risk window from 30 days → 8 hours.**

---

## 📝 Notes

- Current system uses JWT-only (stateless) but has unused DB schema
- Schema design is correct and production-ready
- Only implementation is missing (service layer + middleware)
- No code changes required to database schema
- Backward compatible (existing sessions will expire naturally)

---

**Audited by**: Cursor AI Assistant  
**Next Steps**: Implement Phase 1 fixes immediately

