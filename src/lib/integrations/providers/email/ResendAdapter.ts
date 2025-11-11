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
    
    console.log('🔧 ResendAdapter.initialize() called with config:', {
      hasApiKey: !!this.config.apiKey,
      apiKeyLength: this.config.apiKey?.length,
      apiKeyPrefix: this.config.apiKey?.substring(0, 10),
      fromEmail: this.config.fromEmail,
      metadata: this.config.metadata
    });
    
    if (this.config.apiKey) {
      this.client = new Resend(this.config.apiKey);
      this.initialized = true;
      console.log('✅ Resend client initialized');
    } else {
      console.error('❌ No API key provided to ResendAdapter.initialize()');
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
      console.error('❌ Resend provider not configured:', {
        initialized: this.initialized,
        hasClient: !!this.client,
        hasFromEmail: !!this.config.fromEmail
      });
      throw new Error('Resend provider not configured');
    }

    try {
      console.log('📧 Sending email via Resend:', {
        from: params.from || this.config.fromEmail,
        to: params.to,
        subject: params.subject
      });

      // Resend API returns { data, error } structure
      const { data, error } = await this.client.emails.send({
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

      // Check for Resend API error
      if (error) {
        console.error('❌ Resend API error:', error);
        return {
          success: false,
          error: error.message || JSON.stringify(error),
          timestamp: new Date()
        };
      }

      // Success - data contains the email ID
      if (data && data.id) {
        console.log('✅ Email sent successfully via Resend:', data.id);
        return {
          success: true,
          messageId: data.id,
          timestamp: new Date()
        };
      }

      // Unexpected response
      console.error('❌ Unexpected Resend response:', { data, error });
      return {
        success: false,
        error: 'Unexpected response from Resend API',
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Resend send exception:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
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

