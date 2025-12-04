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

      // For CRITICAL events, also send alert
      if (params.severity === 'CRITICAL') {
        await this.sendCriticalAlert(params);
      }

      console.log('[Audit]', {
        type: params.type,
        severity: params.severity,
        action: params.action,
        accountId: params.accountId,
      });
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

  /**
   * Send critical alert to admins
   */
  private async sendCriticalAlert(params: CreateAuditLogParams): Promise<void> {
    console.error('🚨 CRITICAL ALERT:', {
      type: params.type,
      action: params.action,
      reason: params.reason,
      metadata: params.metadata,
      accountId: params.accountId,
      userId: params.userId,
      diff: params.diff,
    });

    // TODO: Implement actual alerting
    // Options:
    // 1. Email via Resend
    // 2. Slack webhook
    // 3. PagerDuty for on-call
    // 4. SMS for critical issues
    
    // Example email alert:
    /*
    await emailService.sendAlert({
      to: process.env.ADMIN_ALERT_EMAIL || 'admin@apricode.agency',
      subject: `[CRITICAL] Virtual IBAN: ${params.action}`,
      body: `
        CRITICAL EVENT DETECTED
        
        Type: ${params.type}
        Action: ${params.action}
        Severity: ${params.severity}
        
        Reason: ${params.reason}
        
        Details:
        ${JSON.stringify(params.metadata, null, 2)}
        
        Account ID: ${params.accountId || 'N/A'}
        User ID: ${params.userId || 'N/A'}
        Admin ID: ${params.adminId || 'N/A'}
        
        Difference: ${params.diff ? `€${params.diff.toFixed(2)}` : 'N/A'}
        
        Timestamp: ${new Date().toISOString()}
        
        Please investigate immediately!
      `,
    });
    */

    // Example Slack webhook:
    /*
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 CRITICAL: ${params.action}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Critical Virtual IBAN Alert',
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Type:*\n${params.type}` },
              { type: 'mrkdwn', text: `*Severity:*\n${params.severity}` },
              { type: 'mrkdwn', text: `*Action:*\n${params.action}` },
              { type: 'mrkdwn', text: `*Account:*\n${params.accountId || 'N/A'}` },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Reason:*\n${params.reason}`,
            },
          },
        ],
      }),
    });
    */
  }
}

export const virtualIbanAuditService = new VirtualIbanAuditService();

