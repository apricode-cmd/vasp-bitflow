/**
 * UserAuditLogService
 * 
 * Service for creating, querying, and managing user (client) action audit logs
 * 
 * Features:
 * - Comprehensive logging of all client actions
 * - Immutable logs with freezeChecksum (SHA-256)
 * - MFA tracking integration
 * - Context capture (IP, UA, device, location)
 * - Export capabilities (CSV, JSON)
 * - Separate from admin logs for security and compliance
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

export interface CreateUserAuditLogInput {
  userId: string;
  userEmail: string;
  userRole: string;
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
  };
  mfaRequired?: boolean;
  mfaMethod?: string;
  mfaVerifiedAt?: Date;
  mfaEventId?: string;
}

export interface UserAuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

class UserAuditLogService {
  /**
   * Create user audit log entry
   */
  async createLog(input: CreateUserAuditLogInput) {
    // Generate freeze checksum for immutability
    const freezeData = JSON.stringify({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      diffBefore: input.diffBefore,
      diffAfter: input.diffAfter,
      timestamp: new Date().toISOString(),
    });
    const freezeChecksum = crypto.createHash('sha256').update(freezeData).digest('hex');

    return prisma.userAuditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        userRole: input.userRole,
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
        freezeChecksum,
      },
    });
  }

  /**
   * Get user audit logs with filters
   */
  async getLogs(
    filters: UserAuditLogFilters = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.UserAuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.search) {
      where.OR = [
        { userEmail: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
        { entityId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.userAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.userAuditLog.count({ where }),
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
    return prisma.userAuditLog.findUnique({
      where: { id },
    });
  }

  /**
   * Get logs for specific user
   */
  async getLogsByUser(userId: string, limit = 100) {
    return prisma.userAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get logs for specific entity
   */
  async getLogsByEntity(entityType: string, entityId: string) {
    return prisma.userAuditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get statistics
   */
  async getStats(dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.UserAuditLogWhereInput = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalActions,
      actionsByType,
      topActiveUsers,
    ] = await Promise.all([
      prisma.userAuditLog.count({ where }),
      
      prisma.userAuditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.userAuditLog.groupBy({
        by: ['userId', 'userEmail'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalActions,
      actionsByType,
      topActiveUsers,
    };
  }

  /**
   * Export logs (CSV or JSON)
   */
  async exportLogs(
    filters: UserAuditLogFilters = {},
    format: 'csv' | 'json' = 'json'
  ) {
    const where: Prisma.UserAuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const logs = await prisma.userAuditLog.findMany({
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
      'User Email',
      'Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'MFA Required',
      'MFA Method',
      'IP Address',
    ];

    const rows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.userEmail,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
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
      userId: log.userId,
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
}

export const userAuditLogService = new UserAuditLogService();

