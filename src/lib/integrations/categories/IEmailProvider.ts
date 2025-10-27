/**
 * Email Provider Interface
 * 
 * Standard interface for email/notification services
 * Implementations: Resend, SendGrid, AWS SES, Mailgun, etc.
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

// ==========================================
// EMAIL-SPECIFIC TYPES
// ==========================================

/**
 * Email send parameters
 */
export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;              // Plain text version
  from?: string;              // Override default from
  replyTo?: string;           // Reply-to address
  cc?: string | string[];     // CC recipients
  bcc?: string | string[];    // BCC recipients
  attachments?: EmailAttachment[];
  tags?: Record<string, string>; // For tracking
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Bulk email send result
 */
export interface BulkEmailResult {
  sent: number;
  failed: number;
  results: EmailSendResult[];
}

/**
 * Email template data
 */
export interface EmailTemplateData {
  templateId?: string;
  variables: Record<string, any>;
}

// ==========================================
// EMAIL PROVIDER INTERFACE
// ==========================================

/**
 * Interface for email providers
 * All email integrations must implement this
 */
export interface IEmailProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.EMAIL;

  /**
   * Send a single email
   */
  sendEmail(params: EmailParams): Promise<EmailSendResult>;

  /**
   * Send bulk emails (if supported)
   */
  sendBulkEmails?(emails: EmailParams[]): Promise<BulkEmailResult>;

  /**
   * Send templated email (if supported)
   */
  sendTemplatedEmail?(
    to: string | string[],
    template: EmailTemplateData,
    subject?: string
  ): Promise<EmailSendResult>;

  /**
   * Verify email address (if supported)
   */
  verifyEmail?(email: string): Promise<{ isValid: boolean; reason?: string }>;

  /**
   * Get email sending statistics (if supported)
   */
  getStats?(): Promise<{
    sent24h: number;
    failed24h: number;
    quota?: number;
    remaining?: number;
  }>;
}

