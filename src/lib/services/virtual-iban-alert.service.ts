/**
 * Virtual IBAN Alert Service
 * 
 * Sends critical alerts via Email for Virtual IBAN system issues:
 * - Balance mismatches
 * - Failed reconciliations
 * - Suspicious activities
 * - System failures
 */

import { sendNotificationEmail } from './email-notification.service';
import { virtualIbanAuditService } from './virtual-iban-audit.service';
import { VirtualIbanAuditType } from '@prisma/client';

interface AlertOptions {
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  title: string;
  message: string;
  accountId?: string;
  metadata?: Record<string, any>;
}

export class VirtualIbanAlertService {
  private readonly adminEmails: string[] = [
    process.env.ADMIN_ALERT_EMAIL || 'hello@apricode.agency',
  ];

  /**
   * Send alert to admins via email
   */
  async sendAlert(options: AlertOptions): Promise<void> {
    const { severity, title, message, accountId, metadata } = options;

    console.error(`🚨 Virtual IBAN ${severity} ALERT:`, title, message);

    // 1. Log to audit
    await virtualIbanAuditService.log({
      accountId,
      type: VirtualIbanAuditType.SYSTEM_ALERT,
      severity,
      action: `ALERT_${severity}`,
      description: `${title}: ${message}`,
      metadata,
    });

    // 2. Send email to all admin emails
    const emailPromises = this.adminEmails.map(async (email) => {
      try {
        await sendNotificationEmail({
          to: email,
          subject: `🚨 Virtual IBAN ${severity}: ${title}`,
          message: this.formatEmailBody(options),
          data: {
            severity,
            title,
            message,
            accountId: accountId || 'N/A',
            metadata: metadata ? JSON.stringify(metadata, null, 2) : 'None',
            timestamp: new Date().toISOString(),
          },
          templateKey: 'GENERIC',
        });
      } catch (error) {
        console.error(`Failed to send alert email to ${email}:`, error);
      }
    });

    await Promise.allSettled(emailPromises);
  }

  /**
   * Alert: Balance mismatch detected
   */
  async alertBalanceMismatch(data: {
    segregatedAccountId: string;
    bcbBalance: number;
    localBalance: number;
    difference: number;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'CRITICAL',
      title: 'Balance Mismatch Detected',
      message: `Virtual IBAN balances do not match BCB records. Difference: €${data.difference.toFixed(2)}`,
      metadata: {
        segregatedAccountId: data.segregatedAccountId,
        bcbBalance: data.bcbBalance,
        localBalance: data.localBalance,
        difference: data.difference,
      },
    });
  }

  /**
   * Alert: Reconciliation failed
   */
  async alertReconciliationFailed(data: {
    segregatedAccountId: string;
    reason: string;
    error?: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'ERROR',
      title: 'Reconciliation Failed',
      message: `Failed to reconcile Virtual IBAN accounts: ${data.reason}`,
      metadata: {
        segregatedAccountId: data.segregatedAccountId,
        reason: data.reason,
        error: data.error,
      },
    });
  }

  /**
   * Alert: Payment sync failed
   */
  async alertPaymentSyncFailed(data: {
    accountId?: string;
    iban?: string;
    reason: string;
    error?: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'ERROR',
      title: 'Payment Sync Failed',
      message: `Failed to sync payments for Virtual IBAN: ${data.reason}`,
      accountId: data.accountId,
      metadata: {
        iban: data.iban,
        reason: data.reason,
        error: data.error,
      },
    });
  }

  /**
   * Alert: Suspicious activity detected
   */
  async alertSuspiciousActivity(data: {
    accountId: string;
    iban: string;
    activityType: string;
    details: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'WARNING',
      title: 'Suspicious Activity Detected',
      message: `Suspicious activity on Virtual IBAN ${data.iban}: ${data.details}`,
      accountId: data.accountId,
      metadata: {
        iban: data.iban,
        activityType: data.activityType,
        details: data.details,
      },
    });
  }

  /**
   * Alert: Large transaction detected
   */
  async alertLargeTransaction(data: {
    accountId: string;
    iban: string;
    amount: number;
    currency: string;
    transactionId: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'WARNING',
      title: 'Large Transaction Detected',
      message: `Large transaction on Virtual IBAN ${data.iban}: ${data.currency} ${data.amount.toFixed(2)}`,
      accountId: data.accountId,
      metadata: {
        iban: data.iban,
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId,
      },
    });
  }

  /**
   * Alert: Account creation failed
   */
  async alertAccountCreationFailed(data: {
    userId: string;
    userEmail: string;
    reason: string;
    error?: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'ERROR',
      title: 'Virtual IBAN Account Creation Failed',
      message: `Failed to create Virtual IBAN for user ${data.userEmail}: ${data.reason}`,
      metadata: {
        userId: data.userId,
        userEmail: data.userEmail,
        reason: data.reason,
        error: data.error,
      },
    });
  }

  /**
   * Alert: Webhook processing failed
   */
  async alertWebhookFailed(data: {
    webhookId?: string;
    reason: string;
    payload?: any;
    error?: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'ERROR',
      title: 'Webhook Processing Failed',
      message: `Failed to process Virtual IBAN webhook: ${data.reason}`,
      metadata: {
        webhookId: data.webhookId,
        reason: data.reason,
        payload: data.payload,
        error: data.error,
      },
    });
  }

  /**
   * Alert: Provider API failure
   */
  async alertProviderApiFailure(data: {
    provider: string;
    endpoint: string;
    statusCode?: number;
    reason: string;
    error?: string;
  }): Promise<void> {
    await this.sendAlert({
      severity: 'CRITICAL',
      title: 'Provider API Failure',
      message: `${data.provider} API failure on ${data.endpoint}: ${data.reason}`,
      metadata: {
        provider: data.provider,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        reason: data.reason,
        error: data.error,
      },
    });
  }

  /**
   * Format email body for alert
   */
  private formatEmailBody(options: AlertOptions): string {
    const { severity, title, message, accountId, metadata } = options;
    
    let body = `
VIRTUAL IBAN ${severity} ALERT
==============================

${title}

${message}

`;

    if (accountId) {
      body += `\nAccount ID: ${accountId}\n`;
    }

    if (metadata) {
      body += `\nDetails:\n${JSON.stringify(metadata, null, 2)}\n`;
    }

    body += `\nTimestamp: ${new Date().toISOString()}\n`;
    body += `\n---\n`;
    body += `This is an automated alert from Apricode Virtual IBAN System.\n`;
    body += `Please review and take action as necessary.\n`;
    body += `Admin Panel: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.apricode.agency'}/admin/virtual-iban\n`;

    return body;
  }
}

export const virtualIbanAlertService = new VirtualIbanAlertService();

