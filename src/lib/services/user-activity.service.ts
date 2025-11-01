/**
 * User Activity Logging Service
 * 
 * Comprehensive logging of ALL user actions in client cabinet
 * 
 * Logs everything:
 * - Page views
 * - Order creation/cancellation
 * - Document uploads
 * - Profile updates
 * - Wallet management
 * - Any data access
 * 
 * Used for:
 * - Audit trail
 * - Compliance
 * - Fraud detection
 * - User behavior analytics
 * - Ban decision support
 */

import { userAuditLogService } from './user-audit-log.service';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

export type UserAction = 
  // Navigation
  | 'DASHBOARD_VIEWED'
  | 'ORDERS_PAGE_VIEWED'
  | 'PROFILE_PAGE_VIEWED'
  | 'KYC_PAGE_VIEWED'
  | 'BUY_PAGE_VIEWED'
  
  // Orders
  | 'ORDER_VIEWED'
  | 'ORDER_CREATED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_PROOF_UPLOADED'
  | 'PAYMENT_PROOF_DELETED'
  
  // KYC
  | 'KYC_STARTED'
  | 'KYC_DOCUMENT_UPLOADED'
  | 'KYC_SUBMITTED'
  | 'KYC_RESUBMITTED'
  
  // Profile
  | 'PROFILE_VIEWED'
  | 'PROFILE_UPDATED'
  | 'EMAIL_CHANGE_REQUESTED'
  | 'PHONE_UPDATED'
  | 'ADDRESS_UPDATED'
  
  // Wallet
  | 'WALLET_ADDED'
  | 'WALLET_UPDATED'
  | 'WALLET_DELETED'
  | 'WALLET_VERIFIED'
  
  // Settings
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | '2FA_ENABLED'
  | '2FA_DISABLED'
  | 'NOTIFICATION_SETTINGS_UPDATED'
  
  // Data Access
  | 'PERSONAL_DATA_EXPORTED'
  | 'DOCUMENT_DOWNLOADED'
  | 'RATES_VIEWED'
  
  // Communication
  | 'SUPPORT_MESSAGE_SENT'
  | 'SUPPORT_TICKET_CREATED';

interface LogActivityOptions {
  userId: string;
  userEmail: string;
  action: UserAction;
  entityType: string;
  entityId: string;
  diffBefore?: any;
  diffAfter?: any;
  metadata?: any;
}

class UserActivityService {
  /**
   * Get rich request context
   */
  private async getContext() {
    try {
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       headersList.get('x-real-ip') || 
                       'unknown';
      const userAgent = headersList.get('user-agent') || 'unknown';
      const referrer = headersList.get('referer') || undefined;
      const acceptLanguage = headersList.get('accept-language') || undefined;

      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      return {
        ipAddress,
        userAgent,
        deviceType: result.device.type || 'desktop',
        deviceModel: result.device.model || undefined,
        deviceVendor: result.device.vendor || undefined,
        browser: result.browser.name || 'Unknown',
        browserVersion: result.browser.version,
        os: result.os.name || 'Unknown',
        osVersion: result.os.version,
        isMobile: result.device.type === 'mobile',
        isTablet: result.device.type === 'tablet',
        referrer,
        language: acceptLanguage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get context:', error);
      return {
        ipAddress: 'unknown',
        userAgent: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Log any user activity
   */
  async logActivity(options: LogActivityOptions): Promise<void> {
    try {
      const context = await this.getContext();

      await userAuditLogService.createLog({
        userId: options.userId,
        userEmail: options.userEmail,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        diffBefore: options.diffBefore,
        diffAfter: options.diffAfter,
        context: {
          ...context,
          ...options.metadata
        }
      });

      console.log(`📝 User activity logged: ${options.userEmail} - ${options.action}`);
    } catch (error) {
      console.error('Failed to log user activity:', error);
    }
  }

  /**
   * Helper: Log page view
   */
  async logPageView(
    userId: string,
    userEmail: string,
    page: string,
    pageId?: string
  ): Promise<void> {
    const actionMap: Record<string, UserAction> = {
      '/dashboard': 'DASHBOARD_VIEWED',
      '/orders': 'ORDERS_PAGE_VIEWED',
      '/profile': 'PROFILE_PAGE_VIEWED',
      '/kyc': 'KYC_PAGE_VIEWED',
      '/buy': 'BUY_PAGE_VIEWED'
    };

    const action = actionMap[page] || 'DASHBOARD_VIEWED';

    await this.logActivity({
      userId,
      userEmail,
      action,
      entityType: 'Page',
      entityId: pageId || page,
      metadata: { page }
    });
  }

  /**
   * Helper: Log order creation
   */
  async logOrderCreated(
    userId: string,
    userEmail: string,
    orderId: string,
    orderData: {
      amount: number;
      currency: string;
      fiatCurrency: string;
      paymentMethod?: string;
    }
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: orderId,
      diffAfter: orderData,
      metadata: {
        amount: orderData.amount,
        currency: orderData.currency,
        fiatCurrency: orderData.fiatCurrency,
        paymentMethod: orderData.paymentMethod
      }
    });
  }

  /**
   * Helper: Log KYC document upload
   */
  async logKycDocumentUpload(
    userId: string,
    userEmail: string,
    documentType: string,
    fileName: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action: 'KYC_DOCUMENT_UPLOADED',
      entityType: 'KycDocument',
      entityId: `${userId}-${documentType}`,
      metadata: {
        documentType,
        fileName,
        fileSize: undefined // TODO: add if available
      }
    });
  }

  /**
   * Helper: Log profile update
   */
  async logProfileUpdate(
    userId: string,
    userEmail: string,
    before: any,
    after: any,
    changedFields: string[]
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action: 'PROFILE_UPDATED',
      entityType: 'Profile',
      entityId: userId,
      diffBefore: before,
      diffAfter: after,
      metadata: {
        changedFields,
        fieldCount: changedFields.length
      }
    });
  }

  /**
   * Helper: Log payment proof upload
   */
  async logPaymentProofUpload(
    userId: string,
    userEmail: string,
    orderId: string,
    fileName: string,
    fileSize: number
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action: 'PAYMENT_PROOF_UPLOADED',
      entityType: 'PaymentProof',
      entityId: orderId,
      metadata: {
        fileName,
        fileSize,
        orderId
      }
    });
  }

  /**
   * Helper: Log wallet management
   */
  async logWalletAction(
    userId: string,
    userEmail: string,
    action: 'WALLET_ADDED' | 'WALLET_UPDATED' | 'WALLET_DELETED',
    walletId: string,
    walletData?: any
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action,
      entityType: 'Wallet',
      entityId: walletId,
      diffAfter: walletData,
      metadata: {
        currency: walletData?.currency,
        blockchain: walletData?.blockchain
      }
    });
  }

  /**
   * Helper: Log data export (GDPR compliance)
   */
  async logDataExport(
    userId: string,
    userEmail: string,
    exportType: 'FULL' | 'ORDERS' | 'KYC' | 'PROFILE'
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action: 'PERSONAL_DATA_EXPORTED',
      entityType: 'DataExport',
      entityId: `${userId}-${Date.now()}`,
      metadata: {
        exportType,
        severity: 'INFO'
      }
    });
  }

  /**
   * Helper: Log support interaction
   */
  async logSupportMessage(
    userId: string,
    userEmail: string,
    subject: string,
    category: string
  ): Promise<void> {
    await this.logActivity({
      userId,
      userEmail,
      action: 'SUPPORT_MESSAGE_SENT',
      entityType: 'SupportTicket',
      entityId: `${userId}-${Date.now()}`,
      metadata: {
        subject,
        category
      }
    });
  }
}

export const userActivityService = new UserActivityService();

