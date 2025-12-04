/**
 * Virtual IBAN Audit Logging Service
 * 
 * Comprehensive audit trail for compliance and debugging
 */

import { prisma } from '@/lib/prisma';
import { VirtualIbanAuditType, AuditSeverity } from '@prisma/client';

interface CreateAuditLogParams {
  type: VirtualIbanAuditType;
  severity: AuditSeverity;
  action: string;
  accountId?: string;
  userId?: string;
  adminId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  diff?: number;
  reason?: string;
}

class VirtualIbanAuditService {
  /**
   * Create audit log entry
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.virtualIbanAuditLog.create({
        data: {
          type: params.type,
          severity: params.severity,
          action: params.action,
          accountId: params.accountId,
          userId: params.userId,
          adminId: params.adminId,
          oldValue: params.oldValue,
          newValue: params.newValue,
          metadata: params.metadata,
          diff: params.diff,
          reason: params.reason,
        },
      });

      console.log('[Audit]', {
        type: params.type,
        severity: params.severity,
        action: params.action,
        accountId: params.accountId,
      });

      // For CRITICAL events, also log to console (alerting is done separately by VirtualIbanAlertService)
      if (params.severity === 'CRITICAL') {
        console.error('🚨 CRITICAL AUDIT EVENT:', {
          type: params.type,
          action: params.action,
          reason: params.reason,
          metadata: params.metadata,
        });
      }
    } catch (error) {
      // Don't throw - audit logging should never break main flow
      console.error('[Audit] Failed to log:', error);
    }
  }

  /**
   * Log balance change (credit or debit)
   */
  async logBalanceChange(
    accountId: string,
    oldBalance: number,
    newBalance: number,
    reason: string,
    userId?: string,
    adminId?: string
  ): Promise<void> {
    const type = newBalance > oldBalance ? 'BALANCE_CREDIT' : 'BALANCE_DEBIT';
    const diff = Math.abs(newBalance - oldBalance);

    await this.log({
      type,
      severity: 'INFO',
      action: reason,
      accountId,
      userId,
      adminId,
      oldValue: { balance: oldBalance },
      newValue: { balance: newBalance },
      diff,
      reason,
    });
  }

  /**
   * Log balance mismatch (CRITICAL)
   */
  async logBalanceMismatch(
    segregatedAccountId: string,
    bcbTotal: number,
    localTotal: number,
    accountBreakdown: any[]
  ): Promise<void> {
    const diff = Math.abs(bcbTotal - localTotal);

    await this.log({
      type: 'BALANCE_MISMATCH',
      severity: 'CRITICAL',
      action: 'AUTOMATED_VALIDATION',
      metadata: {
        segregatedAccountId,
        bcbTotal,
        localTotal,
        accountBreakdown,
        timestamp: new Date(),
      },
      diff,
      reason: `Segregated account balance (€${bcbTotal}) does not match sum of local balances (€${localTotal})`,
    });
  }

  /**
   * Log webhook processing
   */
  async logWebhookProcessed(
    transactionId: string,
    accountId: string,
    amount: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.log({
      type: 'WEBHOOK_RECEIVED',
      severity: success ? 'INFO' : 'ERROR',
      action: 'WEBHOOK_PROCESSING',
      accountId,
      metadata: {
        transactionId,
        amount,
        success,
        error,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Log missed payment detected by polling
   */
  async logPollingDetected(
    transactionId: string,
    accountId: string,
    amount: number
  ): Promise<void> {
    await this.log({
      type: 'POLLING_DETECTED',
      severity: 'WARNING',
      action: 'MISSED_WEBHOOK_RECOVERED',
      accountId,
      metadata: {
        transactionId,
        amount,
        timestamp: new Date(),
      },
      reason: 'Webhook was missed, recovered via polling',
    });
  }

  /**
   * Log account creation
   */
  async logAccountCreated(
    accountId: string,
    userId: string,
    iban: string,
    currency: string
  ): Promise<void> {
    await this.log({
      type: 'ACCOUNT_CREATED',
      severity: 'INFO',
      action: 'VIRTUAL_IBAN_CREATED',
      accountId,
      userId,
      metadata: {
        iban,
        currency,
        timestamp: new Date(),
      },
      reason: 'New Virtual IBAN account created',
    });
  }

  /**
   * Log account closure
   */
  async logAccountClosed(
    accountId: string,
    userId: string,
    reason: string,
    adminId?: string
  ): Promise<void> {
    await this.log({
      type: 'ACCOUNT_CLOSED',
      severity: 'INFO',
      action: 'VIRTUAL_IBAN_CLOSED',
      accountId,
      userId,
      adminId,
      reason,
      metadata: {
        timestamp: new Date(),
      },
    });
  }

  /**
   * Log manual balance adjustment by admin
   */
  async logManualAdjustment(
    accountId: string,
    oldBalance: number,
    newBalance: number,
    reason: string,
    adminId: string
  ): Promise<void> {
    const diff = Math.abs(newBalance - oldBalance);

    await this.log({
      type: 'MANUAL_ADJUSTMENT',
      severity: 'WARNING',
      action: 'ADMIN_BALANCE_ADJUSTMENT',
      accountId,
      adminId,
      oldValue: { balance: oldBalance },
      newValue: { balance: newBalance },
      diff,
      reason,
    });
  }

  /**
   * Log VOP (Verification of Payee) review
   */
  async logVopReview(
    transactionId: string,
    accountId: string,
    vopStatus: string,
    approved: boolean,
    adminId: string
  ): Promise<void> {
    await this.log({
      type: 'VOP_REVIEW',
      severity: 'INFO',
      action: approved ? 'VOP_APPROVED' : 'VOP_REJECTED',
      accountId,
      adminId,
      metadata: {
        transactionId,
        vopStatus,
        approved,
        timestamp: new Date(),
      },
      reason: `VOP review: ${approved ? 'Approved' : 'Rejected'}`,
    });
  }

  /**
   * Get audit history for account
   */
  async getAccountHistory(
    accountId: string,
    limit = 100
  ): Promise<any[]> {
    return prisma.virtualIbanAuditLog.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get critical events (last 24 hours)
   */
  async getCriticalEvents(): Promise<any[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return prisma.virtualIbanAuditLog.findMany({
      where: {
        severity: 'CRITICAL',
        createdAt: {
          gte: yesterday,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        account: {
          select: {
            id: true,
            iban: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<any> {
    const logs = await prisma.virtualIbanAuditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group by type
    const byType = logs.reduce((acc: any, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {});

    // Group by severity
    const bySeverity = logs.reduce((acc: any, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      total: logs.length,
      byType,
      bySeverity,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }
}

export const virtualIbanAuditService = new VirtualIbanAuditService();

