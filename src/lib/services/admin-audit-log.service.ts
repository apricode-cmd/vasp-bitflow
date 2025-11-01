/**
 * AdminAuditLogService
 * 
 * Service for creating, querying, and managing admin action audit logs
 * 
 * Features:
 * - Comprehensive logging of all admin actions
 * - Immutable logs with freezeChecksum (SHA-256)
 * - MFA tracking integration
 * - Severity levels (INFO, WARNING, CRITICAL)
 * - Reviewable actions for compliance
 * - Context capture (IP, UA, device, location)
 * - Export capabilities (CSV, JSON)
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

export type AdminAuditLogSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CreateAdminAuditLogInput {
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  entityType: string;
  entityId: string;
  diffBefore?: any;
  diffAfter?: any;
  changes?: any;
  context?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
    reason?: string;
  };
  mfaRequired?: boolean;
  mfaMethod?: string;
  mfaVerifiedAt?: Date;
  mfaEventId?: string;
  severity?: AdminAuditLogSeverity;
  isReviewable?: boolean;
}

export interface AdminAuditLogFilters {
  adminId?: string;
  action?: string;
  entityType?: string;
  severity?: AdminAuditLogSeverity;
  isReviewable?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

class AdminAuditLogService {
  /**
   * Create admin audit log entry
   */
  async createLog(input: CreateAdminAuditLogInput) {
    // Generate freeze checksum for immutability
    const freezeData = JSON.stringify({
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      diffBefore: input.diffBefore,
      diffAfter: input.diffAfter,
      timestamp: new Date().toISOString(),
    });
    const freezeChecksum = crypto.createHash('sha256').update(freezeData).digest('hex');

    // Auto-determine severity if not provided
    const severity = input.severity || this.determineSeverity(input.action);

    // Auto-determine if action is reviewable
    const isReviewable = input.isReviewable !== undefined 
      ? input.isReviewable 
      : this.isActionReviewable(input.action);

    return prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        adminEmail: input.adminEmail,
        adminRole: input.adminRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        diffBefore: input.diffBefore,
        diffAfter: input.diffAfter,
        changes: input.changes,
        context: input.context,
        mfaRequired: input.mfaRequired,
        mfaMethod: input.mfaMethod,
        mfaVerifiedAt: input.mfaVerifiedAt,
        mfaEventId: input.mfaEventId,
        severity,
        isReviewable,
        freezeChecksum,
      },
    });
  }

  /**
   * Get admin audit logs with filters
   */
  async getLogs(
    filters: AdminAuditLogFilters = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (filters.adminId) where.adminId = filters.adminId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.severity) where.severity = filters.severity;
    if (filters.isReviewable !== undefined) where.isReviewable = filters.isReviewable;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.search) {
      where.OR = [
        { adminEmail: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
        { entityId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.adminAuditLog.count({ where }),
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
   * Get log by ID
   */
  async getLogById(id: string) {
    return prisma.adminAuditLog.findUnique({
      where: { id },
    });
  }

  /**
   * Get logs for specific admin
   */
  async getLogsByAdmin(adminId: string, limit = 100) {
    return prisma.adminAuditLog.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get logs for specific entity
   */
  async getLogsByEntity(entityType: string, entityId: string) {
    return prisma.adminAuditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get reviewable actions
   */
  async getReviewableActions(reviewed = false) {
    return prisma.adminAuditLog.findMany({
      where: {
        isReviewable: true,
        reviewedAt: reviewed ? { not: null } : null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark action as reviewed
   */
  async markAsReviewed(logId: string, reviewedBy: string, reviewNotes?: string) {
    return prisma.adminAuditLog.update({
      where: { id: logId },
      data: {
        reviewedAt: new Date(),
        reviewedBy,
        reviewNotes,
      },
    });
  }

  /**
   * Get statistics
   */
  async getStats(dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.AdminAuditLogWhereInput = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalActions,
      actionsByType,
      actionsBySeverity,
      topActiveAdmins,
      recentCriticalActions,
    ] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      
      prisma.adminAuditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.adminAuditLog.groupBy({
        by: ['severity'],
        where,
        _count: { id: true },
      }),

      prisma.adminAuditLog.groupBy({
        by: ['adminId', 'adminEmail'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.adminAuditLog.findMany({
        where: { ...where, severity: 'CRITICAL' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalActions,
      actionsByType,
      actionsBySeverity,
      topActiveAdmins,
      recentCriticalActions,
    };
  }

  /**
   * Export logs (CSV or JSON)
   */
  async exportLogs(
    filters: AdminAuditLogFilters = {},
    format: 'csv' | 'json' = 'json'
  ) {
    const where: Prisma.AdminAuditLogWhereInput = {};

    if (filters.adminId) where.adminId = filters.adminId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.severity) where.severity = filters.severity;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'Admin Email',
      'Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'Severity',
      'MFA Required',
      'MFA Method',
      'IP Address',
    ];

    const rows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.adminEmail,
      log.adminRole,
      log.action,
      log.entityType,
      log.entityId,
      log.severity,
      log.mfaRequired ? 'Yes' : 'No',
      log.mfaMethod || 'N/A',
      (log.context as any)?.ipAddress || 'N/A',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Verify log integrity (checksum)
   */
  async verifyLogIntegrity(logId: string): Promise<boolean> {
    const log = await this.getLogById(logId);
    if (!log) return false;

    const freezeData = JSON.stringify({
      adminId: log.adminId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      diffBefore: log.diffBefore,
      diffAfter: log.diffAfter,
      timestamp: log.createdAt.toISOString(),
    });

    const computedChecksum = crypto.createHash('sha256').update(freezeData).digest('hex');
    return computedChecksum === log.freezeChecksum;
  }

  /**
   * Auto-determine severity based on action
   */
  private determineSeverity(action: string): AdminAuditLogSeverity {
    const criticalActions = [
      'ADMIN_DELETED',
      'ADMIN_ROLE_CHANGED',
      'PAYOUT_APPROVED',
      'API_KEY_CREATED',
      'SYSTEM_SETTINGS_CHANGED',
      'BREAKGLASS_LOGIN',
      'MFA_DISABLED',
    ];

    const warningActions = [
      'ADMIN_INVITED',
      'ADMIN_SUSPENDED',
      'ADMIN_REACTIVATED',
      'PAYIN_APPROVED',
      'KYC_OVERRIDE',
      'ORDER_CANCELLED',
    ];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (warningActions.includes(action)) return 'WARNING';
    return 'INFO';
  }

  /**
   * Determine if action requires manual review
   */
  private isActionReviewable(action: string): boolean {
    const reviewableActions = [
      'PAYOUT_APPROVED',
      'KYC_OVERRIDE',
      'ADMIN_ROLE_CHANGED',
      'MFA_DISABLED',
      'BREAKGLASS_LOGIN',
      'SYSTEM_SETTINGS_CHANGED',
    ];

    return reviewableActions.includes(action);
  }
}

export const adminAuditLogService = new AdminAuditLogService();

