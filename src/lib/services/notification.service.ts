/**
 * Notification Service
 * 
 * Core service for managing notifications across all channels.
 * Handles:
 * - Event emission
 * - Queue management
 * - Channel routing
 * - User preferences
 * - Delivery tracking
 * - Real data integration from database
 */

import { prisma } from '@/lib/prisma';
import type { 
  NotificationChannel, 
  NotificationEvent, 
  QueueStatus,
  NotificationQueue 
} from '@prisma/client';
import {
  buildOrderEmailData,
  buildOrderCompletedEmailData,
  buildKycApprovedEmailData,
  buildKycRejectedEmailData,
  buildWelcomeEmailData,
  buildPasswordResetEmailData,
  buildEmailVerificationData,
  buildAdminInviteEmailData,
  buildPaymentReceivedEmailData,
  buildOrderCancelledEmailData,
} from './email-data-builders';

export interface NotificationData {
  userId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

export interface SendNotificationOptions {
  eventKey: string;
  channel?: NotificationChannel | NotificationChannel[];
  data: NotificationData;
  scheduledFor?: Date;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface NotificationResult {
  success: boolean;
  queueIds?: string[];
  error?: string;
  skippedChannels?: NotificationChannel[];
}

class NotificationService {
  /**
   * Send notification for a specific event
   * 
   * @example
   * await notificationService.send({
   *   eventKey: 'ORDER_CREATED',
   *   data: {
   *     userId: 'user123',
   *     subject: 'Order #1234 Created',
   *     message: 'Your order has been created successfully',
   *     data: { orderId: '1234', amount: 100 }
   *   }
   * });
   */
  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    try {
      const { eventKey, channel, data, scheduledFor, priority } = options;

      // 1. Get event configuration
      const event = await prisma.notificationEvent.findUnique({
        where: { eventKey },
      });

      if (!event) {
        return {
          success: false,
          error: `Event "${eventKey}" not found`,
        };
      }

      if (!event.isActive) {
        return {
          success: false,
          error: `Event "${eventKey}" is not active`,
        };
      }

      // 2. Determine channels to use
      let channelsToUse: NotificationChannel[] = [];
      
      if (channel) {
        // Use specified channels (must be supported by event)
        const requestedChannels = Array.isArray(channel) ? channel : [channel];
        channelsToUse = requestedChannels.filter(c => event.channels.includes(c));
      } else {
        // Use all channels supported by event
        channelsToUse = event.channels;
      }

      if (channelsToUse.length === 0) {
        return {
          success: false,
          error: 'No valid channels available for this event',
        };
      }

      // 3. Check user preferences (if userId provided)
      if (data.userId) {
        const filteredChannels = await this.filterByUserPreferences(
          data.userId,
          eventKey,
          channelsToUse
        );
        
        const skippedChannels = channelsToUse.filter(
          c => !filteredChannels.includes(c)
        );
        
        channelsToUse = filteredChannels;
        
        if (channelsToUse.length === 0) {
          return {
            success: true,
            queueIds: [],
            skippedChannels,
          };
        }
      }

      // 4. Build real data from database (for EMAIL channel)
      let enrichedData = data.data || {};
      
      // Only build real data if EMAIL channel is requested
      if (channelsToUse.includes('EMAIL')) {
        try {
          enrichedData = await this.buildRealData(eventKey, data);
          console.log(`✅ Real data built for ${eventKey}:`, Object.keys(enrichedData));
        } catch (error) {
          console.error(`⚠️ Failed to build real data for ${eventKey}, using original:`, error);
          enrichedData = data.data || {};
        }
      }

      // 5. Create queue entries for each channel
      const queueIds: string[] = [];
      
      for (const ch of channelsToUse) {
        const queueEntry = await prisma.notificationQueue.create({
          data: {
            eventKey,
            userId: data.userId,
            recipientEmail: data.recipientEmail,
            recipientPhone: data.recipientPhone,
            channel: ch,
            subject: data.subject,
            message: data.message,
            data: enrichedData, // ✅ Use enriched data with real values
            status: 'PENDING',
            scheduledFor: scheduledFor || new Date(),
          },
        });
        
        queueIds.push(queueEntry.id);
        
        // For IN_APP, also create history entry immediately
        if (ch === 'IN_APP' && data.userId) {
          await prisma.notificationHistory.create({
            data: {
              userId: data.userId,
              eventKey,
              channel: 'IN_APP',
              title: data.subject || event.name,
              message: data.message,
              data: enrichedData, // ✅ Use enriched data
              actionUrl: data.actionUrl || enrichedData.orderUrl || enrichedData.dashboardUrl,
            },
          });
        }
      }

      return {
        success: true,
        queueIds,
      };
    } catch (error) {
      console.error('❌ NotificationService.send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build real data from database for email templates
   * 
   * @param eventKey - The event type (ORDER_CREATED, KYC_APPROVED, etc.)
   * @param data - Initial data with IDs to fetch from database
   * @returns Enriched data with all necessary fields for email template
   */
  async buildRealData(eventKey: string, data: NotificationData): Promise<Record<string, any>> {
    try {
      console.log(`🔍 Building real data for event: ${eventKey}`, data);

      // Extract relevant IDs from data
      const orderId = data.data?.orderId;
      const userId = data.userId || data.data?.userId;
      const adminId = data.data?.adminId;
      const resetToken = data.data?.resetToken;
      const verificationToken = data.data?.verificationToken;
      const setupToken = data.data?.setupToken;
      const reason = data.data?.reason;

      // Build data based on event type
      switch (eventKey) {
        case 'ORDER_CREATED':
          if (orderId) {
            return await buildOrderEmailData(orderId);
          }
          break;

        case 'ORDER_COMPLETED':
          if (orderId) {
            return await buildOrderCompletedEmailData(orderId);
          }
          break;

        case 'ORDER_CANCELLED':
          if (orderId) {
            return await buildOrderCancelledEmailData(orderId, reason);
          }
          break;

        case 'PAYMENT_RECEIVED':
          if (orderId) {
            return await buildPaymentReceivedEmailData(orderId);
          }
          break;

        case 'KYC_APPROVED':
          if (userId) {
            return await buildKycApprovedEmailData(userId);
          }
          break;

        case 'KYC_REJECTED':
          if (userId) {
            return await buildKycRejectedEmailData(userId);
          }
          break;

        case 'WELCOME_EMAIL':
          if (userId) {
            return await buildWelcomeEmailData(userId);
          }
          break;

        case 'PASSWORD_RESET':
          if (userId && resetToken) {
            return await buildPasswordResetEmailData(userId, resetToken);
          }
          break;

        case 'EMAIL_VERIFICATION':
          if (userId && verificationToken) {
            return await buildEmailVerificationData(userId, verificationToken);
          }
          break;

        case 'ADMIN_INVITED':
          if (adminId && setupToken) {
            return await buildAdminInviteEmailData(adminId, setupToken);
          }
          break;

        default:
          console.warn(`⚠️ No data builder for event: ${eventKey}`);
      }

      // Fallback to original data if no builder matches
      return data.data || {};
    } catch (error) {
      console.error(`❌ Error building real data for ${eventKey}:`, error);
      // Return original data on error (graceful degradation)
      return data.data || {};
    }
  }

  /**
   * Filter channels based on user preferences
   */
  private async filterByUserPreferences(
    userId: string,
    eventKey: string,
    channels: NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    try {
      // Get user subscription for this event
      const subscription = await prisma.notificationSubscription.findUnique({
        where: {
          userId_eventKey: {
            userId,
            eventKey,
          },
        },
      });

      // If no subscription, use default (all channels enabled)
      if (!subscription || !subscription.isActive) {
        return channels;
      }

      // Check quiet hours
      if (subscription.quietHours) {
        const isQuietHours = this.isInQuietHours(subscription.quietHours as any);
        if (isQuietHours) {
          // Skip non-urgent notifications during quiet hours
          return [];
        }
      }

      // Filter by enabled channels
      const filtered: NotificationChannel[] = [];
      
      for (const channel of channels) {
        switch (channel) {
          case 'EMAIL':
            if (subscription.emailEnabled) filtered.push(channel);
            break;
          case 'IN_APP':
            if (subscription.inAppEnabled) filtered.push(channel);
            break;
          case 'SMS':
            if (subscription.smsEnabled) filtered.push(channel);
            break;
          case 'PUSH':
            if (subscription.pushEnabled) filtered.push(channel);
            break;
        }
      }

      return filtered;
    } catch (error) {
      console.error('❌ filterByUserPreferences error:', error);
      // On error, return all channels (fail open)
      return channels;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(quietHours: {
    start: string;
    end: string;
    timezone: string;
  }): boolean {
    try {
      // TODO: Implement timezone-aware quiet hours check
      // For now, return false
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's unread notifications
   */
  async getUnreadNotifications(userId: string, limit = 50) {
    return prisma.notificationHistory.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get user's notification history
   */
  async getNotificationHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      eventKey?: string;
      isRead?: boolean;
    }
  ) {
    const { limit = 50, offset = 0, eventKey, isRead } = options || {};

    return prisma.notificationHistory.findMany({
      where: {
        userId,
        ...(eventKey && { eventKey }),
        ...(isRead !== undefined && { isRead }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notificationHistory.updateMany({
      where: {
        id: notificationId,
        userId, // Security: ensure user owns this notification
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return prisma.notificationHistory.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notificationHistory.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    eventKey: string,
    preferences: {
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      frequency?: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY';
      quietHours?: {
        start: string;
        end: string;
        timezone: string;
      };
    }
  ) {
    return prisma.notificationSubscription.upsert({
      where: {
        userId_eventKey: {
          userId,
          eventKey,
        },
      },
      update: preferences,
      create: {
        userId,
        eventKey,
        ...preferences,
      },
    });
  }

  /**
   * Get user preferences for all events
   */
  async getUserPreferences(userId: string) {
    return prisma.notificationSubscription.findMany({
      where: { userId },
      include: {
        event: true,
      },
    });
  }

  /**
   * Process pending notifications (called by cron/worker)
   */
  async processPendingNotifications(limit = 100): Promise<void> {
    try {
      // Get pending notifications
      const pending = await prisma.notificationQueue.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: new Date(),
          },
          attempts: {
            lt: prisma.notificationQueue.fields.maxAttempts,
          },
        },
        take: limit,
        orderBy: {
          scheduledFor: 'asc',
        },
      });

      console.log(`📬 Processing ${pending.length} pending notifications...`);

      for (const notification of pending) {
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error('❌ processPendingNotifications error:', error);
    }
  }

  /**
   * Process single notification
   */
  private async processNotification(notification: NotificationQueue): Promise<void> {
    try {
      // Mark as processing
      await prisma.notificationQueue.update({
        where: { id: notification.id },
        data: {
          status: 'PROCESSING',
          processedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Send based on channel
      let success = false;
      let messageId: string | undefined;
      let error: string | undefined;

      switch (notification.channel) {
        case 'EMAIL':
          ({ success, messageId, error } = await this.sendEmail(notification));
          break;
        case 'SMS':
          ({ success, messageId, error } = await this.sendSMS(notification));
          break;
        case 'PUSH':
          ({ success, messageId, error } = await this.sendPush(notification));
          break;
        case 'IN_APP':
          // IN_APP is already created in history, just mark as sent
          success = true;
          break;
      }

      // Update status
      if (success) {
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            messageId,
          },
        });
      } else {
        // Check if max attempts reached
        const updatedNotification = await prisma.notificationQueue.findUnique({
          where: { id: notification.id },
        });

        if (updatedNotification && updatedNotification.attempts >= updatedNotification.maxAttempts) {
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              error,
            },
          });
        } else {
          // Reset to PENDING for retry
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'PENDING',
              error,
            },
          });
        }
      }
    } catch (error) {
      console.error(`❌ processNotification ${notification.id} error:`, error);
      
      await prisma.notificationQueue.update({
        where: { id: notification.id },
        data: {
          status: 'PENDING',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: NotificationQueue): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Get recipient email
      const recipientEmail = notification.recipientEmail || 
        (notification.userId ? await this.getUserEmail(notification.userId) : null);

      if (!recipientEmail) {
        return {
          success: false,
          error: 'No recipient email available',
        };
      }

      // Import email service dynamically
      const { sendNotificationEmail } = await import('./email-notification.service');

      // Send email
      const result = await sendNotificationEmail({
        to: recipientEmail,
        subject: notification.subject || 'Notification',
        message: notification.message,
        data: notification.data as any,
      });

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Email send failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  /**
   * Get user email by userId
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || null;
    } catch (error) {
      console.error('❌ getUserEmail error:', error);
      return null;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: NotificationQueue): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // TODO: Integrate with SMS provider (Twilio)
      console.log('📱 Sending SMS:', {
        to: notification.recipientPhone,
        message: notification.message,
      });

      return {
        success: true,
        messageId: `sms_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS send failed',
      };
    }
  }

  /**
   * Send push notification
   */
  private async sendPush(notification: NotificationQueue): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // TODO: Integrate with push provider (Firebase, OneSignal)
      console.log('🔔 Sending push:', {
        userId: notification.userId,
        message: notification.message,
      });

      return {
        success: true,
        messageId: `push_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push send failed',
      };
    }
  }
}

export const notificationService = new NotificationService();

