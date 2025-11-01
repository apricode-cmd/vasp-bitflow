/**
 * Audit Log Service
 * 
 * Comprehensive audit logging for compliance and security
 * Features:
 * - Immutable logging with integrity hashing
 * - Severity levels (INFO, WARNING, CRITICAL)
 * - MFA tracking
 * - Compliance review workflow
 * - Export functionality (CSV/JSON)
 * - Retention management
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CreateAuditLogParams {
  // Actor
  userId?: string;
  adminId?: string;
  userEmail?: string;
  userRole?: string;
  
  // Action
  action: string;
  entity: string;
  entityId: string;
  
  // Changes
  oldValue?: any;
  newValue?: any;
  changes?: any;
  
  // Context
  metadata?: any;
  reason?: string;
  
  // Location
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  
  // MFA
  mfaRequired?: boolean;
  mfaMethod?: string;
  mfaVerifiedAt?: Date;
  
  // Compliance
  severity?: AuditSeverity;
  isReviewable?: boolean;
}

export interface AuditLogFilters {
  userId?: string;
  adminId?: string;
  action?: string;
  entity?: string;
  severity?: AuditSeverity;
  isReviewable?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

/**
 * Critical actions that require CRITICAL severity
 */
const CRITICAL_ACTIONS = [
  'APPROVE_PAYOUT',
  'APPROVE_PAYIN',
  'ADMIN_ROLE_CHANGED',
  'SUPER_ADMIN_CREATED',
  'API_KEY_CREATED',
  'INTEGRATION_KEY_UPDATED',
  'USER_IMPERSONATED',
  'AML_STR_SUBMITTED',
  'BREAK_GLASS_USED',
  'MFA_DISABLED',
  'LIMITS_CHANGED',
  'TENANT_DELETED',
  'ADMIN_DELETED',
  'USER_DELETED',
  'KYC_DATA_EXPORTED',
  'PII_EXPORTED',
];

/**
 * Actions that require compliance review
 */
const REVIEWABLE_ACTIONS = [
  'APPROVE_PAYOUT',
  'APPROVE_PAYIN',
  'KYC_APPROVED',
  'KYC_REJECTED',
  'AML_CASE_CREATED',
  'AML_STR_SUBMITTED',
  'USER_SUSPENDED',
  'ADMIN_SUSPENDED',
  'LARGE_TRANSACTION',
];

export class AuditLogService {
  /**
   * Create audit log entry
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      // Determine severity automatically if not provided
      const severity = params.severity || this.determineSeverity(params.action);
      
      // Determine if reviewable
      const isReviewable = params.isReviewable !== undefined
        ? params.isReviewable
        : REVIEWABLE_ACTIONS.includes(params.action);
      
      // Create log entry
      const logData = {
        userId: params.userId || null,
        adminId: params.adminId || null,
        userEmail: params.userEmail || null,
        userRole: params.userRole || null,
        
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        
        oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : null,
        newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : null,
        changes: params.changes ? JSON.parse(JSON.stringify(params.changes)) : null,
        
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
        reason: params.reason || null,
        
        ipAddress: params.ipAddress || 'unknown',
        userAgent: params.userAgent || 'unknown',
        country: params.country || null,
        city: params.city || null,
        
        mfaRequired: params.mfaRequired || false,
        mfaMethod: params.mfaMethod || null,
        mfaVerifiedAt: params.mfaVerifiedAt || null,
        
        severity,
        isReviewable,
      };
      
      // Generate integrity hash
      const hash = this.generateHash(logData);
      
      // Save to database
      await prisma.auditLog.create({
        data: {
          ...logData,
          hash,
        },
      });
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      // Don't throw - logging should never break the main flow
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(
    filters: AuditLogFilters = {},
    page: number = 1,
    limit: number = 50
  ) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.adminId) where.adminId = filters.adminId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.severity) where.severity = filters.severity;
    if (filters.isReviewable !== undefined) where.isReviewable = filters.isReviewable;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entity: { contains: filters.search, mode: 'insensitive' } },
        { userEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          admin: {
            select: {
              id: true,
              email: true,
              workEmail: true,
              firstName: true,
              lastName: true,
              roleCode: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get admin's activity
   */
  async getAdminActivity(adminId: string, limit: number = 20) {
    return prisma.auditLog.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get critical logs for review
   */
  async getCriticalLogs(unreviewed: boolean = false) {
    return prisma.auditLog.findMany({
      where: {
        severity: 'CRITICAL',
        ...(unreviewed ? { reviewedAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        admin: {
          select: {
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
      },
    });
  }

  /**
   * Mark log as reviewed
   */
  async markReviewed(logId: string, reviewedBy: string, notes?: string) {
    return prisma.auditLog.update({
      where: { id: logId },
      data: {
        reviewedAt: new Date(),
        reviewedBy,
        metadata: notes
          ? {
              ...(await prisma.auditLog.findUnique({
                where: { id: logId },
                select: { metadata: true },
              }))?.metadata,
              reviewNotes: notes,
            }
          : undefined,
      },
    });
  }

  /**
   * Export logs to CSV
   */
  async exportToCSV(filters: AuditLogFilters = {}): Promise<string> {
    const { logs } = await this.getLogs(filters, 1, 10000); // Max 10k records

    const headers = [
      'Timestamp',
      'Actor',
      'Role',
      'Action',
      'Entity',
      'Entity ID',
      'Severity',
      'MFA Required',
      'MFA Method',
      'IP Address',
      'User Agent',
      'Reason',
    ].join(',');

    const rows = logs.map((log) => {
      const actor = log.userEmail || log.admin?.workEmail || log.admin?.email || 'System';
      const role = log.userRole || log.admin?.roleCode || 'N/A';
      
      return [
        log.createdAt.toISOString(),
        `"${actor}"`,
        role,
        log.action,
        log.entity,
        log.entityId,
        log.severity,
        log.mfaRequired ? 'Yes' : 'No',
        log.mfaMethod || 'N/A',
        log.ipAddress || 'unknown',
        `"${log.userAgent || 'unknown'}"`,
        log.reason ? `"${log.reason.replace(/"/g, '""')}"` : 'N/A',
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Export logs to JSON
   */
  async exportToJSON(filters: AuditLogFilters = {}): Promise<string> {
    const { logs } = await this.getLogs(filters, 1, 10000);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, bySeverity, byAction, withMfa, unreviewed] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.count({
        where: { ...where, mfaRequired: true },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          isReviewable: true,
          reviewedAt: null,
        },
      }),
    ]);

    return {
      total,
      bySeverity: Object.fromEntries(
        bySeverity.map((s) => [s.severity, s._count])
      ),
      topActions: byAction.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      withMfa,
      unreviewedCount: unreviewed,
    };
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(action: string): AuditSeverity {
    if (CRITICAL_ACTIONS.includes(action)) {
      return 'CRITICAL';
    }
    
    if (
      action.includes('DELETE') ||
      action.includes('SUSPEND') ||
      action.includes('REJECT')
    ) {
      return 'WARNING';
    }
    
    return 'INFO';
  }

  /**
   * Generate integrity hash
   */
  private generateHash(data: any): string {
    const hashData = JSON.stringify({
      userId: data.userId,
      adminId: data.adminId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      timestamp: new Date().toISOString(),
    });
    
    return crypto
      .createHash('sha256')
      .update(hashData)
      .digest('hex');
  }

  /**
   * Clean up old logs (retention policy)
   * Should be run as cron job
   */
  async cleanupOldLogs(retentionYears: number = 5): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    // Only delete INFO logs older than retention period
    // Keep WARNING and CRITICAL logs indefinitely
    const result = await prisma.auditLog.deleteMany({
      where: {
        severity: 'INFO',
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

export const auditLogService = new AuditLogService();

