/**
 * Email Notification Service
 * 
 * Sends emails using templates and Resend provider.
 * Integrates with:
 * - EmailTemplateService (white-label templates)
 * - Resend (email provider)
 * - EmailLog (tracking)
 */

import { Resend } from 'resend';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import { emailTemplateService } from './email-template.service';
import type { TemplateVariables } from './email-template.service';

const resend = new Resend(config.email.apiKey);

export interface SendNotificationEmailOptions {
  to: string;
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
  const { to, subject, message, data, templateKey, orgId = null } = options;

  try {
    // 1. Render template
    const rendered = await emailTemplateService.render({
      templateKey: templateKey || 'GENERIC',
      variables: {
        ...data,
        message, // For generic templates
      },
      orgId,
    });

    // 2. Send email via Resend
    const response = await resend.emails.send({
      from: config.email.from,
      to,
      subject: subject || rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    // 3. Log email
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
          resendId: response.data?.id,
          templateKey,
          variables: data,
        },
      },
    });

    console.log(`✅ Email sent to ${to}: ${subject || rendered.subject}`);

    return {
      success: true,
      messageId: response.data?.id,
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

