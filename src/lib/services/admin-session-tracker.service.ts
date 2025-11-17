/**
 * Admin Session Tracker Service
 * 
 * Enterprise-grade session tracking with database persistence
 * Features:
 * - Idle timeout enforcement
 * - Max session duration enforcement
 * - Device and location tracking
 * - Centralized session revocation
 * - Activity monitoring
 * 
 * Compliant with: PSD2/SCA, DORA, SOC 2, ISO 27001
 */

import { prisma } from '@/lib/prisma';
import type { AdminSession } from '@prisma/client';

interface CreateSessionParams {
  adminId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  country?: string | null;
  city?: string | null;
  mfaMethod?: string | null;
  jwtToken?: string | null; // For Passkey: JWT token to store in sessionKey
}

interface SessionValidationResult {
  valid: boolean;
  reason?: string;
  session?: AdminSession;
}

/**
 * Get admin settings with defaults
 */
async function getAdminSettings(adminId: string) {
  const settings = await prisma.adminSettings.findUnique({
    where: { adminId },
  });

  return {
    idleTimeout: settings?.idleTimeout || 15, // 15 minutes default
    maxSessionDuration: settings?.maxSessionDuration || 8, // 8 hours default
  };
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Detect browser from user agent
 */
function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('opera')) return 'Opera';
  return 'other';
}

/**
 * Detect OS from user agent
 */
function detectOS(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'other';
}

/**
 * Create session record in database
 */
export async function createSessionRecord(
  params: CreateSessionParams
): Promise<AdminSession> {
  const { adminId, sessionId, ipAddress, userAgent, country, city, mfaMethod, jwtToken } = params;

  // Get admin settings
  const settings = await getAdminSettings(adminId);

  // Calculate expiration
  const now = new Date();
  const maxDurationMs = settings.maxSessionDuration * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + maxDurationMs);

  // For Passkey: use JWT token as sessionKey
  // For NextAuth: use sessionId as sessionKey (backwards compat)
  const sessionKey = jwtToken || sessionId;

  // Create session record
  const session = await prisma.adminSession.create({
    data: {
      adminId,
      sessionId,
      sessionToken: sessionId.substring(0, 64), // Store prefix for lookup
      sessionKey, // JWT token for Passkey, sessionId for NextAuth
      ipAddress,
      userAgent,
      deviceType: detectDeviceType(userAgent),
      browser: detectBrowser(userAgent),
      os: detectOS(userAgent),
      country: country || null,
      city: city || null,
      mfaMethod: mfaMethod || null,
      mfaVerifiedAt: mfaMethod ? now : null,
      isActive: true,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      idleTimeout: settings.idleTimeout,
      maxDuration: settings.maxSessionDuration,
    },
  });

  console.log(`✅ [SessionTracker] Created session ${sessionId.substring(0, 8)}... for admin ${adminId} (sessionKey: ${jwtToken ? 'JWT' : 'UUID'})`);

  return session;
}

/**
 * Validate session and update activity
 * 
 * @param sessionId - Unique session identifier (UUID)
 */
export async function validateAndUpdateSession(
  sessionId: string
): Promise<SessionValidationResult> {
  try {
    // Find active session by sessionId (not sessionKey!)
    const session = await prisma.adminSession.findFirst({
      where: {
        sessionId: sessionId, // ← FIXED: Use sessionId, not sessionKey
        isActive: true,
      },
    });

    if (!session) {
      console.warn(`⚠️ [SessionTracker] Session not found: ${sessionId.substring(0, 8)}...`);
      return { valid: false, reason: 'Session not found or inactive' };
    }

    const now = new Date();

    // Check if session expired (max duration)
    if (session.expiresAt < now) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          terminatedAt: now,
          terminationReason: 'MAX_DURATION_EXCEEDED',
        },
      });
      console.warn(`⚠️ [SessionTracker] Session ${sessionId.substring(0, 8)}... expired (max duration)`);
      return { valid: false, reason: 'Session expired (maximum duration exceeded)' };
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
      console.warn(`⚠️ [SessionTracker] Session ${sessionId.substring(0, 8)}... expired (idle timeout)`);
      return { valid: false, reason: 'Session expired (idle timeout exceeded)' };
    }

    // ✅ Session valid - UPDATE lastActivity
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActivity: now },
    });

    console.log(`✅ [SessionTracker] Session ${sessionId.substring(0, 8)}... validated and updated`);
    return { valid: true, session };
  } catch (error) {
    console.error('❌ [SessionTracker] Validation error:', error);
    return { valid: false, reason: 'Session validation failed' };
  }
}

/**
 * Terminate session by sessionKey
 */
export async function terminateSession(
  sessionKey: string,
  reason: string = 'USER_LOGOUT',
  terminatedBy?: string
): Promise<boolean> {
  try {
    const session = await prisma.adminSession.findFirst({
      where: {
        sessionKey: sessionKey,
        isActive: true,
      },
    });

    if (!session) {
      console.warn(`⚠️ [SessionTracker] Session not found: ${sessionKey.substring(0, 8)}...`);
      return false;
    }

    await prisma.adminSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
        terminatedBy,
      },
    });

    console.log(`✅ [SessionTracker] Terminated session ${sessionKey.substring(0, 8)}... (${reason})`);
    return true;
  } catch (error) {
    console.error('❌ [SessionTracker] Termination error:', error);
    return false;
  }
}

/**
 * Terminate session by database ID (record.id, not sessionId!)
 */
export async function terminateSessionById(
  recordId: string, // This is AdminSession.id (cuid), NOT sessionId (UUID)!
  reason: string = 'USER_LOGOUT',
  terminatedBy?: string
): Promise<boolean> {
  try {
    console.log(`🔍 [SessionTracker] Looking for session with id (record ID): ${recordId}`);
    
    const session = await prisma.adminSession.findUnique({
      where: { id: recordId },
    });

    if (!session) {
      console.error(`❌ [SessionTracker] Session record not found with id: ${recordId}`);
      return false;
    }

    console.log(`🔍 [SessionTracker] Found session:`, {
      id: session.id,
      sessionId: session.sessionId.substring(0, 8) + '...',
      isActive: session.isActive,
      adminId: session.adminId
    });

    if (!session.isActive) {
      console.warn(`⚠️ [SessionTracker] Session already inactive: ${recordId}`);
      return false;
    }

    await prisma.adminSession.update({
      where: { id: recordId },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
        terminatedBy,
      },
    });

    console.log(`✅ [SessionTracker] Terminated session record ${recordId} (sessionId: ${session.sessionId.substring(0, 8)}..., reason: ${reason})`);
    return true;
  } catch (error) {
    console.error('❌ [SessionTracker] Termination error:', error);
    return false;
  }
}

/**
 * Terminate all sessions for admin (force logout)
 */
export async function terminateAllAdminSessions(
  adminId: string,
  reason: string = 'ADMIN_FORCE_LOGOUT',
  terminatedBy?: string
): Promise<number> {
  try {
    const result = await prisma.adminSession.updateMany({
      where: {
        adminId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
        terminatedBy,
      },
    });

    console.log(`✅ [SessionTracker] Terminated ${result.count} sessions for admin ${adminId}`);
    return result.count;
  } catch (error) {
    console.error('❌ [SessionTracker] Bulk termination error:', error);
    return 0;
  }
}

/**
 * Get active sessions for admin
 */
export async function getAdminActiveSessions(adminId: string): Promise<AdminSession[]> {
  return prisma.adminSession.findMany({
    where: {
      adminId,
      isActive: true,
    },
    orderBy: {
      lastActivity: 'desc',
    },
  });
}

/**
 * Get all active sessions (for super admin)
 */
export async function getAllActiveSessions(): Promise<
  Array<AdminSession & { admin: { email: string | null; workEmail: string | null; firstName: string; lastName: string; role: string } }>
> {
  return prisma.adminSession.findMany({
    where: {
      isActive: true,
    },
    include: {
      admin: {
        select: {
          email: true,
          workEmail: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: {
      lastActivity: 'desc',
    },
  });
}

/**
 * Cleanup expired sessions (run periodically via cron)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date();

    // Mark expired sessions as inactive
    const result = await prisma.adminSession.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        isActive: false,
        terminatedAt: now,
        terminationReason: 'AUTO_EXPIRED',
      },
    });

    if (result.count > 0) {
      console.log(`🧹 [SessionTracker] Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  } catch (error) {
    console.error('❌ [SessionTracker] Cleanup error:', error);
    return 0;
  }
}

