/**
 * Email Notification Service
 * 
 * Sends emails using templates and email provider from IntegrationFactory.
 * Integrates with:
 * - EmailTemplateService (white-label templates)
 * - IntegrationFactory (email provider - Resend, SendGrid, etc.)
 * - EmailLog (tracking)
 */

import { prisma } from '@/lib/prisma';
import { emailTemplateService } from './email-template.service';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import type { TemplateVariables } from './email-template.service';

export interface SendNotificationEmailOptions {
  to: string;
  from?: string; // Optional, will use provider default if not provided
  subject?: string; // Optional, will use template subject if not provided
  message?: string; // For fallback templates
  data: TemplateVariables;
  templateKey?: string; // e.g., 'ORDER_CREATED'
  orgId?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send notification email using template
 */
export async function sendNotificationEmail(
  options: SendNotificationEmailOptions
): Promise<SendEmailResult> {
  const { to, from, subject, message, data, templateKey, orgId = null } = options;

  try {
    // 1. Get email provider from IntegrationFactory
    const emailProvider = await integrationFactory.getEmailProvider();

    if (!emailProvider) {
      throw new Error('No email provider configured');
    }

    // 2. Render template
    const rendered = await emailTemplateService.render({
      templateKey: templateKey || 'GENERIC',
      variables: {
        ...data,
        message, // For generic templates
      },
      orgId,
    });

    // 3. Send email via provider (Resend, SendGrid, etc.)
    const result = await emailProvider.sendEmail({
      to,
      from, // Optional override
      subject: subject || rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }

    // 4. Log email
    await prisma.emailLog.create({
      data: {
        userId: data.userId as string | undefined,
        recipient: to,
        subject: subject || rendered.subject,
        template: templateKey || 'GENERIC',
        templateId: rendered.templateId,
        status: 'SENT',
        sentAt: new Date(),
        metadata: {
          messageId: result.messageId,
          provider: emailProvider.providerId,
          templateKey,
          variables: data,
        },
      },
    });

    console.log(`✅ Email sent to ${to} via ${emailProvider.providerId}: ${subject || rendered.subject}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('❌ sendNotificationEmail error:', error);

    // Log failed email
    try {
      await prisma.emailLog.create({
        data: {
          userId: data.userId as string | undefined,
          recipient: to,
          subject: subject || 'Email Notification',
          template: templateKey || 'GENERIC',
          status: 'FAILED',
          failedAt: new Date(),
          error: error.message || 'Unknown error',
          metadata: {
            templateKey,
            variables: data,
          },
        },
      });
    } catch (logError) {
      console.error('❌ Failed to log email error:', logError);
    }

    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send bulk emails (for marketing/announcements)
 */
export async function sendBulkEmails(
  recipients: string[],
  options: Omit<SendNotificationEmailOptions, 'to'>
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  for (const email of recipients) {
    const result = await sendNotificationEmail({
      ...options,
      to: email,
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        email,
        error: result.error || 'Unknown error',
      });
    }

    // Rate limiting: wait 100ms between emails
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

