/**
 * Resend Adapter
 * 
 * Adapter for existing Resend email service to implement IEmailProvider interface
 * Wraps the existing email service functions for backward compatibility
 */

import {
  IEmailProvider,
  EmailParams,
  EmailSendResult
} from '../../categories/IEmailProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult
} from '../../types';
import { Resend } from 'resend';

/**
 * Resend-specific configuration
 */
interface ResendConfig extends BaseIntegrationConfig {
  fromEmail?: string;
}

/**
 * Resend adapter implementing IEmailProvider
 * 
 * This adapter wraps Resend to provide a standard interface
 * for email operations
 */
export class ResendAdapter implements IEmailProvider {
  public readonly providerId = 'resend';
  public readonly category = IntegrationCategory.EMAIL as const;

  private config: ResendConfig = {};
  private initialized = false;
  private client: Resend | null = null;

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as ResendConfig;
    
    if (this.config.apiKey) {
      this.client = new Resend(this.config.apiKey);
      this.initialized = true;
    }
  }

  /**
   * Test Resend API connection
   */
  async test(): Promise<IntegrationTestResult> {
    try {
      if (!this.config.apiKey) {
        return {
          success: false,
          message: 'API key not configured',
          timestamp: new Date()
        };
      }

      // Test API key validity with Resend test endpoint
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.config.fromEmail || 'onboarding@resend.dev',
          to: 'delivered@resend.dev', // Resend test email
          subject: 'Test Email',
          html: '<p>Test</p>'
        })
      });

      // Resend returns 422 for test emails, which means API key is valid
      if (response.ok || response.status === 422) {
        return {
          success: true,
          message: 'Resend connection successful',
          timestamp: new Date()
        };
      }

      return {
        success: false,
        message: `Resend test failed: ${response.statusText}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Resend connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.initialized && !!this.client && !!this.config.fromEmail;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: 'https://api.resend.com',
      metadata: {
        fromEmail: this.config.fromEmail
      }
    };
  }

  /**
   * Send a single email
   */
  async sendEmail(params: EmailParams): Promise<EmailSendResult> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Resend provider not configured');
    }

    try {
      const result = await this.client.emails.send({
        from: params.from || this.config.fromEmail!,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
        tags: params.tags ? Object.entries(params.tags).map(([name, value]) => ({ name, value })) : undefined
      });

      return {
        success: true,
        messageId: result.data?.id,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('Resend send error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails: EmailParams[]): Promise<{
    sent: number;
    failed: number;
    results: EmailSendResult[];
  }> {
    const results: EmailSendResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed, results };
  }
}

// Export singleton instance for backward compatibility
export const resendAdapter = new ResendAdapter();

