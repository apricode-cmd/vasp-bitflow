/**
 * Security Audit Log Service
 * 
 * Comprehensive logging of ALL security events:
 * - Failed login attempts
 * - Successful logins
 * - Account lockouts
 * - Password changes
 * - 2FA events
 * - Suspicious activity
 * - Session management
 */

import { prisma } from '@/lib/prisma';
import { adminAuditLogService } from './admin-audit-log.service';
import { userAuditLogService } from './user-audit-log.service';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

interface SecurityEventContext {
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  metadata?: any;
}

class SecurityAuditService {
  /**
   * Get request context (IP, UA, device info)
   */
  private async getContext(): Promise<SecurityEventContext> {
    try {
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       headersList.get('x-real-ip') || 
                       'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';

      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      return {
        ipAddress,
        userAgent,
        deviceType: result.device.type || 'desktop',
        browser: result.browser.name || 'Unknown',
        os: result.os.name || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to get context:', error);
      return {
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
    }
  }

  /**
   * Log failed login attempt (CRITICAL for security monitoring)
   */
  async logFailedLogin(
    email: string,
    reason: 'INVALID_PASSWORD' | 'USER_NOT_FOUND' | 'ACCOUNT_DISABLED' | 'INVALID_2FA',
    role: 'CLIENT' | 'ADMIN' = 'CLIENT'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      // Try to find user to get ID (if exists)
      const user = role === 'ADMIN' 
        ? await prisma.admin.findUnique({ where: { email }, select: { id: true } })
        : await prisma.user.findUnique({ where: { email }, select: { id: true } });

      if (role === 'ADMIN' && user) {
        await adminAuditLogService.createLog({
          adminId: user.id,
          adminEmail: email,
          adminRole: 'UNKNOWN',
          action: 'LOGIN_FAILED',
          entityType: 'Admin',
          entityId: user.id,
          context: {
            ...context,
            reason,
            severity: 'WARNING'
          }
        });
      } else if (user) {
        await userAuditLogService.createLog({
          userId: user.id,
          userEmail: email,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: user.id,
          context: {
            ...context,
            reason,
            severity: 'WARNING'
          }
        });
      } else {
        // User not found - log to SystemLog as suspicious activity
        const { systemLogService } = await import('./system-log.service');
        await systemLogService.createLog({
          source: 'NODE',
          eventType: 'ERROR',
          level: 'WARN',
          endpoint: '/api/auth/callback/credentials',
          method: 'POST',
          statusCode: 401,
          errorMessage: `Failed login attempt for non-existent user: ${email}`,
          metadata: {
            email,
            reason,
            ...context
          }
        });
      }

      console.warn(`🔒 Failed login attempt: ${email} (${reason})`);
    } catch (error) {
      console.error('Failed to log failed login:', error);
    }
  }

  /**
   * Log successful login
   */
  async logSuccessfulLogin(
    userId: string,
    email: string,
    role: 'CLIENT' | 'ADMIN'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      if (role === 'ADMIN') {
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { roleCode: true }
        });

        if (admin) {
          await adminAuditLogService.createLog({
            adminId: userId,
            adminEmail: email,
            adminRole: admin.roleCode,
            action: 'LOGIN',
            entityType: 'Admin',
            entityId: userId,
            context
          });
        }
      } else {
        await userAuditLogService.createLog({
          userId,
          userEmail: email,
          action: 'LOGIN',
          entityType: 'User',
          entityId: userId,
          context
        });
      }

      console.log(`✅ Successful login: ${email} (${role})`);
    } catch (error) {
      console.error('Failed to log successful login:', error);
    }
  }

  /**
   * Log logout
   */
  async logLogout(
    userId: string,
    email: string,
    role: 'CLIENT' | 'ADMIN'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      if (role === 'ADMIN') {
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { roleCode: true }
        });

        if (admin) {
          await adminAuditLogService.createLog({
            adminId: userId,
            adminEmail: email,
            adminRole: admin.roleCode,
            action: 'LOGOUT',
            entityType: 'Admin',
            entityId: userId,
            context
          });
        }
      } else {
        await userAuditLogService.createLog({
          userId,
          userEmail: email,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: userId,
          context
        });
      }

      console.log(`👋 Logout: ${email} (${role})`);
    } catch (error) {
      console.error('Failed to log logout:', error);
    }
  }

  /**
   * Log password change
   */
  async logPasswordChange(
    userId: string,
    email: string,
    role: 'CLIENT' | 'ADMIN'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      if (role === 'ADMIN') {
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { roleCode: true }
        });

        if (admin) {
          await adminAuditLogService.createLog({
            adminId: userId,
            adminEmail: email,
            adminRole: admin.roleCode,
            action: 'PASSWORD_CHANGED',
            entityType: 'Admin',
            entityId: userId,
            context
          });
        }
      } else {
        await userAuditLogService.createLog({
          userId,
          userEmail: email,
          action: 'PASSWORD_CHANGED',
          entityType: 'User',
          entityId: userId,
          context
        });
      }

      console.log(`🔑 Password changed: ${email}`);
    } catch (error) {
      console.error('Failed to log password change:', error);
    }
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequest(
    email: string,
    role: 'CLIENT' | 'ADMIN' = 'CLIENT'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      const user = role === 'ADMIN'
        ? await prisma.admin.findUnique({ where: { email }, select: { id: true, roleCode: true } })
        : await prisma.user.findUnique({ where: { email }, select: { id: true } });

      if (!user) return;

      if (role === 'ADMIN' && 'roleCode' in user) {
        await adminAuditLogService.createLog({
          adminId: user.id,
          adminEmail: email,
          adminRole: user.roleCode,
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'Admin',
          entityId: user.id,
          context
        });
      } else {
        await userAuditLogService.createLog({
          userId: user.id,
          userEmail: email,
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'User',
          entityId: user.id,
          context
        });
      }

      console.log(`📧 Password reset requested: ${email}`);
    } catch (error) {
      console.error('Failed to log password reset request:', error);
    }
  }

  /**
   * Log 2FA setup
   */
  async log2FASetup(
    userId: string,
    email: string,
    method: 'TOTP' | 'SMS' | 'EMAIL',
    role: 'CLIENT' | 'ADMIN' = 'CLIENT'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      if (role === 'ADMIN') {
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { roleCode: true }
        });

        if (admin) {
          await adminAuditLogService.createLog({
            adminId: userId,
            adminEmail: email,
            adminRole: admin.roleCode,
            action: '2FA_ENABLED',
            entityType: 'Admin',
            entityId: userId,
            context: {
              ...context,
              method
            }
          });
        }
      } else {
        await userAuditLogService.createLog({
          userId,
          userEmail: email,
          action: '2FA_ENABLED',
          entityType: 'User',
          entityId: userId,
          context: {
            ...context,
            method
          }
        });
      }

      console.log(`🔐 2FA enabled: ${email} (${method})`);
    } catch (error) {
      console.error('Failed to log 2FA setup:', error);
    }
  }

  /**
   * Log 2FA disable (CRITICAL security event)
   */
  async log2FADisable(
    userId: string,
    email: string,
    role: 'CLIENT' | 'ADMIN' = 'CLIENT'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      if (role === 'ADMIN') {
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { roleCode: true }
        });

        if (admin) {
          await adminAuditLogService.createLog({
            adminId: userId,
            adminEmail: email,
            adminRole: admin.roleCode,
            action: '2FA_DISABLED',
            entityType: 'Admin',
            entityId: userId,
            context: {
              ...context,
              severity: 'CRITICAL'
            }
          });
        }
      } else {
        await userAuditLogService.createLog({
          userId,
          userEmail: email,
          action: '2FA_DISABLED',
          entityType: 'User',
          entityId: userId,
          context: {
            ...context,
            severity: 'CRITICAL'
          }
        });
      }

      console.warn(`⚠️ 2FA disabled: ${email}`);
    } catch (error) {
      console.error('Failed to log 2FA disable:', error);
    }
  }

  /**
   * Log account lockout (too many failed attempts)
   */
  async logAccountLockout(
    email: string,
    failedAttempts: number,
    role: 'CLIENT' | 'ADMIN' = 'CLIENT'
  ): Promise<void> {
    try {
      const context = await this.getContext();

      const user = role === 'ADMIN'
        ? await prisma.admin.findUnique({ where: { email }, select: { id: true, roleCode: true } })
        : await prisma.user.findUnique({ where: { email }, select: { id: true } });

      if (!user) return;

      if (role === 'ADMIN' && 'roleCode' in user) {
        await adminAuditLogService.createLog({
          adminId: user.id,
          adminEmail: email,
          adminRole: user.roleCode,
          action: 'ACCOUNT_LOCKED',
          entityType: 'Admin',
          entityId: user.id,
          context: {
            ...context,
            failedAttempts,
            severity: 'CRITICAL'
          }
        });
      } else {
        await userAuditLogService.createLog({
          userId: user.id,
          userEmail: email,
          action: 'ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: user.id,
          context: {
            ...context,
            failedAttempts,
            severity: 'CRITICAL'
          }
        });
      }

      console.error(`🚨 Account locked: ${email} (${failedAttempts} failed attempts)`);
    } catch (error) {
      console.error('Failed to log account lockout:', error);
    }
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | null,
    email: string,
    reason: string,
    details: any
  ): Promise<void> {
    try {
      const context = await this.getContext();
      const { systemLogService } = await import('./system-log.service');

      await systemLogService.createLog({
        source: 'SYSTEM',
        eventType: 'ERROR',
        level: 'CRITICAL',
        endpoint: '/security/suspicious-activity',
        method: 'POST',
        statusCode: 403,
        errorMessage: `Suspicious activity detected: ${reason}`,
        metadata: {
          userId,
          email,
          reason,
          details,
          ...context
        }
      });

      console.error(`🚨 Suspicious activity: ${email} - ${reason}`);
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }
}

export const securityAuditService = new SecurityAuditService();

