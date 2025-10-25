/**
 * Audit Service
 * 
 * Comprehensive audit logging for tracking all administrative actions
 * and critical user operations
 */

import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export interface AuditFilters {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
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
    // Get request context
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || null;

    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValue: changes?.oldValue || null,
        newValue: changes?.newValue || null,
        metadata: additionalMetadata || null,
        ipAddress,
        userAgent
      }
    });

    return auditLog;
  }

  /**
   * Logs a user action (e.g., order created, KYC submitted)
   */
  async logUserAction(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLogEntry> {
    return this.logAction(action, entity, entityId, undefined, userId, metadata);
  }

  /**
   * Logs an admin action with before/after values
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
    return this.logAction(
      action,
      entity,
      entityId,
      { oldValue, newValue },
      adminId,
      metadata
    );
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
    return this.logAction(action, entity, entityId, undefined, null, {
      ...metadata,
      system: true
    });
  }

  /**
   * Retrieves audit logs with filtering
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
   * Gets audit trail for a specific entity
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
   * Gets user activity history
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
   * Gets recent admin actions
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
   * Gets statistics for audit logs
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
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  PAYMENT_PROOF_UPLOADED: 'PAYMENT_PROOF_UPLOADED',

  // KYC actions
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
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

