/**
 * Session Revocation Checker
 * 
 * Server-side utility to check if a session has been revoked.
 * Used in Server Components and API routes (Node.js runtime only).
 * 
 * SECURITY: This runs on the server, can use Prisma safely.
 */

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

/**
 * Get current session key from request headers
 */
export function getSessionKey(): string {
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  const getDevice = (ua: string) => {
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'mobile';
    if (ua.includes('Tablet') || ua.includes('iPad')) return 'tablet';
    return 'desktop';
  };
  
  const getBrowser = (ua: string) => {
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    return 'Unknown';
  };
  
  const device = getDevice(userAgent);
  const browser = getBrowser(userAgent);
  
  return `${ipAddress}-${device}-${browser}`;
}

/**
 * Check if current session is revoked
 * @returns {boolean} true if session is revoked, false otherwise
 */
export async function isSessionRevoked(): Promise<boolean> {
  try {
    const sessionKey = getSessionKey();
    
    const revokedSession = await prisma.sessionRevocation.findUnique({
      where: { sessionKey },
      select: {
        id: true,
        expiresAt: true,
        reason: true,
      },
    });
    
    if (!revokedSession) {
      return false;
    }
    
    // Check if still valid (not expired)
    if (new Date() < revokedSession.expiresAt) {
      console.log(`⛔ Revoked session detected: ${sessionKey} (Reason: ${revokedSession.reason || 'Manual termination'})`);
      return true;
    }
    
    // Expired revocation - cleanup asynchronously
    prisma.sessionRevocation.delete({
      where: { sessionKey },
    }).catch(() => {
      // Ignore errors (might be already deleted)
    });
    
    return false;
  } catch (error) {
    console.error('Session revocation check error:', error);
    // Fail open - don't block user if check fails
    return false;
  }
}

/**
 * Revoke a session by its key
 */
export async function revokeSession(
  sessionKey: string,
  userId: string,
  revokedBy: string,
  reason?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Parse session key to extract details
  const [ipAddress, deviceType, browser] = sessionKey.split('-');
  
  await prisma.sessionRevocation.create({
    data: {
      sessionKey,
      userId,
      ipAddress: ipAddress || 'unknown',
      deviceType: deviceType || 'unknown',
      browser: browser || 'Unknown',
      revokedBy,
      reason: reason || 'Manual session termination by administrator',
      expiresAt,
    },
  });
  
  console.log(`✅ Session revoked: ${sessionKey} (expires: ${expiresAt.toISOString()})`);
}

