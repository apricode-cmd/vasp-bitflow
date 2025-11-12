/**
 * Event Emitter Service
 * 
 * Centralized event emission for business logic.
 * Automatically triggers notifications when business events occur.
 * 
 * Usage:
 * ```ts
 * import { eventEmitter } from '@/lib/services/event-emitter.service';
 * 
 * // Emit event
 * await eventEmitter.emit('ORDER_CREATED', {
 *   userId: 'user123',
 *   orderId: 'order456',
 *   amount: 100,
 *   currency: 'EUR'
 * });
 * ```
 */

import { notificationService } from './notification.service';
import type { NotificationChannel } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface EventPayload {
  userId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  [key: string]: any;
}

export interface EmitOptions {
  channels?: NotificationChannel[];
  scheduledFor?: Date;
  skipNotification?: boolean;
}

class EventEmitterService {
  /**
   * Get platform name from settings
   */
  private async getPlatformName(): Promise<string> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'brandName' }
      });
      return setting?.value || 'Apricode Exchange';
    } catch (error) {
      console.error('Error fetching platform name:', error);
      return 'Apricode Exchange';
    }
  }

  /**
   * Emit an event and trigger notifications
   */
  async emit(
    eventKey: string,
    payload: EventPayload,
    options?: EmitOptions
  ): Promise<void> {
    try {
      console.log(`🔔 Event emitted: ${eventKey}`, payload);

      // Skip notification if requested
      if (options?.skipNotification) {
        return;
      }

      // Generate notification content based on event
      const notificationData = await this.generateNotificationContent(eventKey, payload);

      if (!notificationData) {
        console.warn(`⚠️ No notification content for event: ${eventKey}`);
        return;
      }

      // Send notification
      const result = await notificationService.send({
        eventKey,
        channel: options?.channels,
        data: {
          userId: payload.userId,
          recipientEmail: payload.recipientEmail,
          recipientPhone: payload.recipientPhone,
          ...notificationData,
        },
        scheduledFor: options?.scheduledFor,
      });

      if (!result.success) {
        console.error(`❌ Failed to send notification for ${eventKey}:`, result.error);
      } else {
        console.log(`✅ Notification queued for ${eventKey}:`, result.queueIds);
      }
    } catch (error) {
      console.error(`❌ EventEmitter.emit error for ${eventKey}:`, error);
    }
  }

  /**
   * Generate notification content based on event type
   */
  private async generateNotificationContent(
    eventKey: string,
    payload: EventPayload
  ): Promise<{
    subject: string;
    message: string;
    data: Record<string, any>;
    actionUrl?: string;
  } | null> {
    // Get platform name for dynamic branding
    const platformName = await this.getPlatformName();
    switch (eventKey) {
      // ORDER EVENTS
      case 'ORDER_CREATED':
        return {
          subject: `Order #${payload.orderId} Created`,
          message: `Your order for ${payload.amount} ${payload.currency} has been created successfully. We're waiting for your payment.`,
          data: {
            orderId: payload.orderId,
            amount: payload.amount,
            currency: payload.currency,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      case 'ORDER_PAYMENT_RECEIVED':
        return {
          subject: `Payment Received for Order #${payload.orderId}`,
          message: `We've received your payment of ${payload.amount} ${payload.currency}. Your order is being processed.`,
          data: {
            orderId: payload.orderId,
            amount: payload.amount,
            currency: payload.currency,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      case 'ORDER_COMPLETED':
        return {
          subject: `Order #${payload.orderId} Completed`,
          message: `Your order has been completed! ${payload.cryptoAmount} ${payload.cryptoCurrency} has been sent to your wallet.`,
          data: {
            orderId: payload.orderId,
            cryptoAmount: payload.cryptoAmount,
            cryptoCurrency: payload.cryptoCurrency,
            walletAddress: payload.walletAddress,
            txHash: payload.txHash,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      case 'ORDER_CANCELLED':
        return {
          subject: `Order #${payload.orderId} Cancelled`,
          message: `Your order has been cancelled. ${payload.reason || 'No reason provided.'}`,
          data: {
            orderId: payload.orderId,
            reason: payload.reason,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      // KYC EVENTS
      case 'KYC_SUBMITTED':
        return {
          subject: 'KYC Verification Submitted',
          message: 'Your KYC verification has been submitted and is under review. We\'ll notify you once it\'s processed.',
          data: {
            kycSessionId: payload.kycSessionId,
          },
          actionUrl: '/kyc',
        };

      case 'KYC_APPROVED':
        return {
          subject: 'KYC Verification Approved',
          message: 'Congratulations! Your KYC verification has been approved. You can now make purchases.',
          data: {
            kycSessionId: payload.kycSessionId,
          },
          actionUrl: '/buy',
        };

      case 'KYC_REJECTED':
        return {
          subject: 'KYC Verification Rejected',
          message: `Your KYC verification was rejected. Reason: ${payload.reason || 'Please contact support for details.'}`,
          data: {
            kycSessionId: payload.kycSessionId,
            reason: payload.reason,
          },
          actionUrl: '/kyc',
        };

      case 'KYC_DOCUMENTS_REQUIRED':
        return {
          subject: 'Additional Documents Required',
          message: 'We need additional documents to complete your KYC verification. Please upload them as soon as possible.',
          data: {
            kycSessionId: payload.kycSessionId,
            requiredDocuments: payload.requiredDocuments,
          },
          actionUrl: '/kyc',
        };

      // USER EVENTS
      case 'WELCOME_EMAIL':
        return {
          subject: `Welcome to ${platformName}!`,
          message: `Welcome ${payload.userName}! We're excited to have you on board. Complete your KYC verification to start trading.`,
          data: {
            userId: payload.userId,
            userName: payload.userName,
            platformName, // Add for email template
          },
          actionUrl: '/kyc',
        };

      // ADMIN EVENTS
      case 'ADMIN_INVITED':
        return {
          subject: 'Admin Invitation',
          message: `You've been invited to join as an admin. Click the link to set up your account.`,
          data: payload.data || {
            adminName: payload.adminName,
            setupUrl: payload.setupUrl,
            expiresIn: payload.expiresIn,
            role: payload.role,
            adminDashboard: payload.adminDashboard,
          },
          actionUrl: payload.setupUrl,
        };

      // PAYMENT EVENTS
      case 'PAYMENT_PENDING':
        return {
          subject: 'Payment Pending Confirmation',
          message: `Your payment of ${payload.amount} ${payload.currency} is pending confirmation.`,
          data: {
            paymentId: payload.paymentId,
            amount: payload.amount,
            currency: payload.currency,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      case 'PAYMENT_CONFIRMED':
        return {
          subject: 'Payment Confirmed',
          message: `Your payment of ${payload.amount} ${payload.currency} has been confirmed!`,
          data: {
            paymentId: payload.paymentId,
            amount: payload.amount,
            currency: payload.currency,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      case 'PAYMENT_FAILED':
        return {
          subject: 'Payment Failed',
          message: `Your payment of ${payload.amount} ${payload.currency} has failed. ${payload.reason || 'Please try again or contact support.'}`,
          data: {
            paymentId: payload.paymentId,
            amount: payload.amount,
            currency: payload.currency,
            reason: payload.reason,
          },
          actionUrl: `/orders/${payload.orderId}`,
        };

      // SECURITY EVENTS
      case 'SECURITY_LOGIN':
        return {
          subject: 'New Login Detected',
          message: `A new login was detected from ${payload.location || 'unknown location'} using ${payload.device || 'unknown device'}. If this wasn't you, please secure your account immediately.`,
          data: {
            location: payload.location,
            device: payload.device,
            ipAddress: payload.ipAddress,
            timestamp: payload.timestamp,
          },
          actionUrl: '/profile?tab=security',
        };

      case 'SECURITY_PASSWORD_CHANGED':
        return {
          subject: 'Password Changed',
          message: 'Your password has been changed successfully. If you didn\'t make this change, please contact support immediately.',
          data: {
            timestamp: payload.timestamp,
          },
          actionUrl: '/profile?tab=security',
        };

      case 'SECURITY_2FA_ENABLED':
        return {
          subject: 'Two-Factor Authentication Enabled',
          message: 'Two-factor authentication has been enabled on your account. Your account is now more secure!',
          data: {
            method: payload.method,
          },
          actionUrl: '/profile?tab=security',
        };

      case 'SECURITY_2FA_DISABLED':
        return {
          subject: 'Two-Factor Authentication Disabled',
          message: 'Two-factor authentication has been disabled on your account. We recommend keeping 2FA enabled for better security.',
          data: {
            method: payload.method,
          },
          actionUrl: '/profile?tab=security',
        };

      case 'SECURITY_SUSPICIOUS_ACTIVITY':
        return {
          subject: '⚠️ Suspicious Activity Detected',
          message: `Suspicious activity was detected on your account: ${payload.activity}. Please review your account security.`,
          data: {
            activity: payload.activity,
            timestamp: payload.timestamp,
          },
          actionUrl: '/profile?tab=security',
        };

      // SYSTEM EVENTS
      case 'SYSTEM_MAINTENANCE':
        return {
          subject: 'Scheduled Maintenance',
          message: `Our system will undergo maintenance on ${payload.date} from ${payload.startTime} to ${payload.endTime}. Services may be temporarily unavailable.`,
          data: {
            date: payload.date,
            startTime: payload.startTime,
            endTime: payload.endTime,
          },
        };

      case 'SYSTEM_UPDATE':
        return {
          subject: 'New Features Available',
          message: `We've added new features to improve your experience: ${payload.features}`,
          data: {
            features: payload.features,
            version: payload.version,
          },
        };

      default:
        console.warn(`⚠️ No content generator for event: ${eventKey}`);
        return null;
    }
  }

  /**
   * Emit multiple events in batch
   */
  async emitBatch(
    events: Array<{
      eventKey: string;
      payload: EventPayload;
      options?: EmitOptions;
    }>
  ): Promise<void> {
    await Promise.all(
      events.map(({ eventKey, payload, options }) =>
        this.emit(eventKey, payload, options)
      )
    );
  }
}

export const eventEmitter = new EventEmitterService();

