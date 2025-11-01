/**
 * Audit Service
 * 
 * Единая система логирования для User и Admin действий.
 * Использует единую таблицу AuditLog с полями actorType/actorId.
 */

import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import crypto from 'crypto';

export interface AuditFilters {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

class AuditService {
  /**
   * Get request context
   */
  private async getRequestContext(): Promise<{ ipAddress: string; userAgent: string | null }> {
    try {
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       headersList.get('x-real-ip') || 
                       'unknown';
      const userAgent = headersList.get('user-agent') || null;
      return { ipAddress, userAgent };
    } catch (error) {
      console.warn('⚠️ Failed to get request context:', error);
      return { ipAddress: 'unknown', userAgent: null };
    }
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(action: string): 'INFO' | 'WARNING' | 'CRITICAL' {
    const criticalActions = [
      'PAYOUT_APPROVED', 'ADMIN_ROLE_CHANGED', 'SUPER_ADMIN_CREATED',
      'API_KEY_CREATED', 'API_KEY_REVOKED', 'INTEGRATION_KEY_UPDATED',
      'USER_IMPERSONATED', 'AML_STR_SUBMITTED', 'BREAK_GLASS_USED',
      'MFA_DISABLED', 'LIMITS_CHANGED', 'TENANT_DELETED',
      'ADMIN_DELETED', 'ADMIN_INVITED', 'ADMIN_SUSPENDED', 'ADMIN_TERMINATED',
      'USER_DELETED', 'KYC_DATA_EXPORTED', 'PII_EXPORTED'
    ];

    if (criticalActions.includes(action)) {
      return 'CRITICAL';
    }

    if (
      action.includes('DELETE') ||
      action.includes('SUSPEND') ||
      action.includes('REJECT') ||
      action.includes('TERMINATE')
    ) {
      return 'WARNING';
    }

    return 'INFO';
  }

  /**
   * Generate freeze checksum for immutability
   */
  private generateFreezeChecksum(data: any): string {
    const hashData = JSON.stringify({
      ...data,
      salt: process.env.AUDIT_SALT || 'default-audit-salt-change-in-production',
    });
    
    return crypto
      .createHash('sha256')
      .update(hashData)
      .digest('hex');
  }

  /**
   * Logs an action with full context
   */
  async logAction(
    action: string,
    entity: string,
    entityId: string,
    changes?: {
      oldValue?: Record<string, unknown> | null;
      newValue?: Record<string, unknown> | null;
    },
    userId?: string | null,
    additionalMetadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    const { ipAddress, userAgent } = await this.getRequestContext();
    const severity = this.determineSeverity(action);

    // Generate freeze checksum
    const freezeChecksum = this.generateFreezeChecksum({
      action,
      entityType: entity,
      entityId,
      timestamp: new Date().toISOString(),
    });

    // Create audit log entry with new fields
    const auditLog = await prisma.auditLog.create({
      data: {
        // New unified fields
        actorType: userId ? 'ADMIN' : 'SYSTEM',
        actorId: userId || null,
        entityType: entity,
        diffBefore: changes?.oldValue,
        diffAfter: changes?.newValue,
        
        // Legacy fields for backward compatibility
        userId,
        action,
        entity,
        entityId,
        oldValue: changes?.oldValue || null,
        newValue: changes?.newValue || null,
        metadata: additionalMetadata || null,
        ipAddress,
        userAgent,
        
        // Compliance fields
        severity,
        freezeChecksum,
        
        // Context
        context: {
          ipAddress,
          userAgent,
          ...additionalMetadata,
        },
      }
    });

    return auditLog;
  }

  /**
   * Logs a user action (e.g., order created, KYC submitted)
   * Routes to UserAuditLog table
   */
  async logUserAction(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    const { ipAddress, userAgent } = await this.getRequestContext();
    const severity = this.determineSeverity(action);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });

    // Write to UserAuditLog table (not legacy AuditLog)
    const { userAuditLogService } = await import('./user-audit-log.service');
    await userAuditLogService.createLog({
      userId,
      userEmail: user?.email || 'unknown',
      userRole: user?.role || 'CLIENT',
      action,
      entityType: entity,
      entityId,
      context: {
        ipAddress,
        userAgent,
        ...metadata,
      },
      severity,
    });

    // Return in legacy format for compatibility
    return {
      id: 'user-log',
      userId,
      action,
      entity,
      entityId,
      oldValue: null,
      newValue: null,
      metadata: metadata || null,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    };
  }

  /**
   * Logs an admin action with before/after values
   * Routes to AdminAuditLog table
   */
  async logAdminAction(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    const { ipAddress, userAgent } = await this.getRequestContext();
    const severity = this.determineSeverity(action);

    // Get admin details
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { workEmail: true, roleCode: true },
    });

    // Write to AdminAuditLog table (not legacy AuditLog)
    const { adminAuditLogService } = await import('./admin-audit-log.service');
    await adminAuditLogService.createLog({
      adminId,
      adminEmail: admin?.workEmail || 'unknown',
      adminRole: admin?.roleCode || 'ADMIN',
      action,
      entityType: entity,
      entityId,
      diffBefore: oldValue,
      diffAfter: newValue,
      context: {
        ipAddress,
        userAgent,
        ...metadata,
      },
      severity,
    });

    // Return in legacy format for compatibility
    return {
      id: 'admin-log',
      userId: adminId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      metadata: metadata || null,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    };
  }

  /**
   * Logs a system action (automated processes)
   */
  async logSystemAction(
    action: string,
    entity: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    const { ipAddress, userAgent } = await this.getRequestContext();

    const freezeChecksum = this.generateFreezeChecksum({
      actorType: 'SYSTEM',
      action,
      entityType: entity,
      entityId,
      timestamp: new Date().toISOString(),
    });

    return this.logAction(action, entity, entityId, undefined, null, {
      ...metadata,
      system: true,
      freezeChecksum,
    });
  }

  /**
   * Alternative method signature for log (used by some routes)
   */
  async log(params: {
    actorType: 'ADMIN' | 'USER' | 'SYSTEM';
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId: string;
    diffBefore?: any;
    diffAfter?: any;
    changes?: any;
    context?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    mfaRequired?: boolean;
    mfaMethod?: string;
    mfaVerifiedAt?: Date;
    mfaEventId?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    isReviewable?: boolean;
  }): Promise<void> {
    const { ipAddress, userAgent } = await this.getRequestContext();
    const severity = params.severity || this.determineSeverity(params.action);

    const freezeChecksum = this.generateFreezeChecksum({
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
    });

    await prisma.auditLog.create({
      data: {
        actorType: params.actorType,
        actorId: params.actorId || null,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        entity: params.entityType, // Legacy
        entityType: params.entityType,
        entityId: params.entityId,
        diffBefore: params.diffBefore,
        diffAfter: params.diffAfter,
        changes: params.changes,
        reason: params.reason,
        ipAddress: params.ipAddress || ipAddress,
        userAgent: params.userAgent || userAgent,
        mfaRequired: params.mfaRequired || false,
        mfaMethod: params.mfaMethod,
        mfaVerifiedAt: params.mfaVerifiedAt,
        mfaEventId: params.mfaEventId,
        severity,
        isReviewable: params.isReviewable || false,
        freezeChecksum,
        context: {
          ipAddress: params.ipAddress || ipAddress,
          userAgent: params.userAgent || userAgent,
          ...params.context,
        },
        metadata: params.context,
      },
    });
  }

  /**
   * Retrieves audit logs with filtering (LEGACY - returns old AuditLog table)
   */
  async getAuditLogs(filters: AuditFilters): Promise<{
    logs: AuditLogEntry[];
    total: number;
  }> {
    const where: Record<string, unknown> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entity) {
      where.entity = filters.entity;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.ipAddress) {
      where.ipAddress = {
        contains: filters.ipAddress,
        mode: 'insensitive'
      };
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = filters.fromDate;
      }
      if (filters.toDate) {
        (where.createdAt as Record<string, unknown>).lte = filters.toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return { logs, total };
  }

  /**
   * Gets audit trail for a specific entity (LEGACY)
   */
  async getEntityAuditTrail(
    entity: string,
    entityId: string
  ): Promise<AuditLogEntry[]> {
    return prisma.auditLog.findMany({
      where: {
        entity,
        entityId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  /**
   * Gets user activity history (LEGACY)
   */
  async getUserActivity(
    userId: string,
    limit = 100
  ): Promise<AuditLogEntry[]> {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Gets recent admin actions (LEGACY)
   */
  async getRecentAdminActions(limit = 50): Promise<AuditLogEntry[]> {
    return prisma.auditLog.findMany({
      where: {
        user: {
          role: 'ADMIN'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  /**
   * Gets statistics for audit logs (LEGACY)
   */
  async getAuditStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByEntity: Record<string, number>;
    topUsers: Array<{ userId: string; email: string; actionCount: number }>;
  }> {
    const where: Record<string, unknown> = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        (where.createdAt as Record<string, unknown>).gte = fromDate;
      }
      if (toDate) {
        (where.createdAt as Record<string, unknown>).lte = toDate;
      }
    }

    const [totalActions, actionsByType, actionsByEntity, topUsers] =
      await Promise.all([
        // Total count
        prisma.auditLog.count({ where }),

        // Group by action
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: true
        }),

        // Group by entity
        prisma.auditLog.groupBy({
          by: ['entity'],
          where,
          _count: true
        }),

        // Top users by activity
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            ...where,
            userId: { not: null }
          },
          _count: true,
          orderBy: {
            _count: {
              userId: 'desc'
            }
          },
          take: 10
        })
      ]);

    // Format results
    const actionsByTypeMap: Record<string, number> = {};
    actionsByType.forEach((item) => {
      actionsByTypeMap[item.action] = item._count;
    });

    const actionsByEntityMap: Record<string, number> = {};
    actionsByEntity.forEach((item) => {
      actionsByEntityMap[item.entity] = item._count;
    });

    // Fetch user details for top users
    const topUsersWithDetails = await Promise.all(
      topUsers.map(async (item) => {
        if (!item.userId) {
          return {
            userId: 'system',
            email: 'system',
            actionCount: item._count
          };
        }

        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { id: true, email: true }
        });

        return {
          userId: item.userId,
          email: user?.email || 'unknown',
          actionCount: item._count
        };
      })
    );

    return {
      totalActions,
      actionsByType: actionsByTypeMap,
      actionsByEntity: actionsByEntityMap,
      topUsers: topUsersWithDetails
    };
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Audit action constants
export const AUDIT_ACTIONS = {
  // User actions
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATED: 'USER_UPDATED',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',

  // Order actions
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_DELETED: 'ORDER_DELETED',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  PAYMENT_PROOF_UPLOADED: 'PAYMENT_PROOF_UPLOADED',

  // KYC actions
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_CREATED: 'KYC_CREATED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_DELETED: 'KYC_DELETED',
  KYC_DOCUMENT_UPLOADED: 'KYC_DOCUMENT_UPLOADED',

  // Admin actions
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  BANK_DETAILS_UPDATED: 'BANK_DETAILS_UPDATED',
  TRADING_PAIR_UPDATED: 'TRADING_PAIR_UPDATED',
  CURRENCY_UPDATED: 'CURRENCY_UPDATED',
  PAYMENT_METHOD_UPDATED: 'PAYMENT_METHOD_UPDATED',
  WALLET_ADDED: 'WALLET_ADDED',
  WALLET_REMOVED: 'WALLET_REMOVED',
  MANUAL_RATE_SET: 'MANUAL_RATE_SET',
  INTEGRATION_UPDATED: 'INTEGRATION_UPDATED',
  API_KEY_GENERATED: 'API_KEY_GENERATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',

  // System actions
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_WARNING: 'SYSTEM_WARNING',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE'
} as const;

// Audit entity constants
export const AUDIT_ENTITIES = {
  USER: 'User',
  ORDER: 'Order',
  KYC_SESSION: 'KycSession',
  TRADING_PAIR: 'TradingPair',
  CURRENCY: 'Currency',
  FIAT_CURRENCY: 'FiatCurrency',
  BANK_DETAILS: 'BankDetails',
  PAYMENT_METHOD: 'PaymentMethod',
  PLATFORM_WALLET: 'PlatformWallet',
  USER_WALLET: 'UserWallet',
  MANUAL_RATE: 'ManualRate',
  INTEGRATION_SETTING: 'IntegrationSetting',
  SYSTEM_SETTINGS: 'SystemSettings',
  API_KEY: 'ApiKey'
} as const;
