/**
 * Email Template Service
 * 
 * Manages email templates with white-label support.
 * Features:
 * - Template rendering with variables
 * - White-label branding (logo, colors, company name)
 * - Fallback to default templates
 * - Variable substitution ({{variableName}})
 */

import { prisma } from '@/lib/prisma';
import { getPublicSettings } from '@/lib/settings';
import type { EmailCategory } from '@prisma/client';

export interface TemplateVariables {
  // Common variables (always available)
  platformName?: string;
  brandLogo?: string;
  primaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  currentYear?: number;
  
  // Event-specific variables
  [key: string]: any;
}

export interface RenderOptions {
  templateKey: string;
  variables: TemplateVariables;
  orgId?: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
}

class EmailTemplateService {
  /**
   * Render email template with variables
   */
  async render(options: RenderOptions): Promise<RenderedEmail> {
    const { templateKey, variables, orgId = null } = options;

    try {
      // 1. Get template (org-specific or global)
      const template = await this.getTemplate(templateKey, orgId);

      if (!template) {
        // Fallback to default template
        return this.renderDefaultTemplate(templateKey, variables);
      }

      // 2. Get white-label settings
      const settings = await getPublicSettings();

      // 3. Merge variables with white-label settings
      const allVariables: TemplateVariables = {
        brandName: settings.brandName || 'Apricode Exchange',
        platformName: settings.brandName || 'Apricode Exchange',
        brandLogo: settings.brandLogo || '/logo.png',
        primaryColor: settings.primaryColor || '#06b6d4',
        supportEmail: settings.supportEmail || 'support@apricode.io',
        supportPhone: settings.supportPhone || '',
        currentYear: new Date().getFullYear(),
        ...variables,
      };

      // 4. Render template
      const subject = this.replaceVariables(template.subject, allVariables);
      const html = this.replaceVariables(template.htmlContent, allVariables);
      const text = template.textContent 
        ? this.replaceVariables(template.textContent, allVariables)
        : undefined;

      return {
        subject,
        html,
        text,
        templateId: template.id,
      };
    } catch (error) {
      console.error('❌ EmailTemplateService.render error:', error);
      // Fallback to default template
      return this.renderDefaultTemplate(templateKey, variables);
    }
  }

  /**
   * Get template by key (org-specific or global)
   */
  private async getTemplate(key: string, orgId: string | null) {
    // Try org-specific template first
    if (orgId) {
      const orgTemplate = await prisma.emailTemplate.findFirst({
        where: {
          key,
          orgId,
          isActive: true,
          status: 'PUBLISHED',
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (orgTemplate) {
        return orgTemplate;
      }
    }

    // Fallback to global template
    const globalTemplate = await prisma.emailTemplate.findFirst({
      where: {
        key,
        orgId: null,
        isActive: true,
        status: 'PUBLISHED',
      },
      orderBy: {
        version: 'desc',
      },
    });

    return globalTemplate;
  }

  /**
   * Replace variables in template string
   * Supports: {{variableName}} and {{variableName|default}}
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{([^}|]+)(\|([^}]+))?\}\}/g, (match, key, _, defaultValue) => {
      const trimmedKey = key.trim();
      const value = variables[trimmedKey];

      if (value !== undefined && value !== null) {
        return String(value);
      }

      if (defaultValue !== undefined) {
        return defaultValue.trim();
      }

      // Return empty string if no value and no default
      return '';
    });
  }

  /**
   * Render default template (fallback when no template found)
   */
  private async renderDefaultTemplate(
    templateKey: string,
    variables: TemplateVariables
  ): Promise<RenderedEmail> {
    const settings = await getPublicSettings();

    const allVariables: TemplateVariables = {
      brandName: settings.brandName || 'Apricode Exchange',
      platformName: settings.brandName || 'Apricode Exchange',
      brandLogo: settings.brandLogo || '/logo.png',
      primaryColor: settings.primaryColor || '#06b6d4',
      supportEmail: settings.supportEmail || 'support@apricode.io',
      supportPhone: settings.supportPhone || '',
      currentYear: new Date().getFullYear(),
      ...variables,
    };

    // Get default template content
    const defaultTemplate = this.getDefaultTemplateContent(templateKey, allVariables);

    return {
      subject: defaultTemplate.subject,
      html: defaultTemplate.html,
      text: defaultTemplate.text,
    };
  }

  /**
   * Get default template content (hardcoded fallback)
   */
  private getDefaultTemplateContent(
    templateKey: string,
    variables: TemplateVariables
  ): { subject: string; html: string; text?: string } {
    const { platformName, brandLogo, primaryColor, supportEmail } = variables;

    // Base HTML layout
    const baseLayout = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${platformName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
              <img src="${brandLogo}" alt="${platformName}" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 14px; color: #6b7280;">
              <p style="margin: 0 0 10px 0;">&copy; ${variables.currentYear} ${platformName}. All rights reserved.</p>
              <p style="margin: 0;">
                <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Template-specific content
    switch (templateKey) {
      case 'ORDER_CREATED':
        return {
          subject: `Order #${variables.orderId} Created - ${platformName}`,
          html: baseLayout(`
            <h1 style="color: #111827; font-size: 24px; margin: 0 0 20px 0;">Order Created</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              Your order for <strong>${variables.amount} ${variables.currency}</strong> has been created successfully.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              <strong>Order ID:</strong> ${variables.orderId}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              We're waiting for your payment. Please check your order details for payment instructions.
            </p>
            <a href="${variables.actionUrl || '#'}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Order
            </a>
          `),
          text: `Order Created\n\nYour order for ${variables.amount} ${variables.currency} has been created successfully.\n\nOrder ID: ${variables.orderId}\n\nWe're waiting for your payment.`,
        };

      case 'ORDER_COMPLETED':
        return {
          subject: `Order #${variables.orderId} Completed - ${platformName}`,
          html: baseLayout(`
            <h1 style="color: #10b981; font-size: 24px; margin: 0 0 20px 0;">✓ Order Completed</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              Great news! Your order has been completed successfully.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              <strong>${variables.cryptoAmount} ${variables.cryptoCurrency}</strong> has been sent to your wallet.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              <strong>Transaction Hash:</strong><br/>
              <code style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; word-break: break-all;">${variables.txHash || 'N/A'}</code>
            </p>
            <a href="${variables.actionUrl || '#'}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Order
            </a>
          `),
          text: `Order Completed\n\nYour order has been completed successfully.\n\n${variables.cryptoAmount} ${variables.cryptoCurrency} has been sent to your wallet.\n\nTransaction Hash: ${variables.txHash || 'N/A'}`,
        };

      case 'KYC_APPROVED':
        return {
          subject: `KYC Verification Approved - ${platformName}`,
          html: baseLayout(`
            <h1 style="color: #10b981; font-size: 24px; margin: 0 0 20px 0;">✓ KYC Approved</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              Congratulations! Your KYC verification has been approved.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              You can now make purchases on our platform.
            </p>
            <a href="${variables.actionUrl || '#'}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Start Buying
            </a>
          `),
          text: `KYC Approved\n\nCongratulations! Your KYC verification has been approved.\n\nYou can now make purchases on our platform.`,
        };

      case 'KYC_REJECTED':
        return {
          subject: `KYC Verification Rejected - ${platformName}`,
          html: baseLayout(`
            <h1 style="color: #ef4444; font-size: 24px; margin: 0 0 20px 0;">KYC Rejected</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              Unfortunately, your KYC verification was rejected.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              <strong>Reason:</strong> ${variables.reason || 'Please contact support for details.'}
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              You can submit a new verification or contact our support team for assistance.
            </p>
            <a href="${variables.actionUrl || '#'}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Try Again
            </a>
          `),
          text: `KYC Rejected\n\nUnfortunately, your KYC verification was rejected.\n\nReason: ${variables.reason || 'Please contact support for details.'}`,
        };

      default:
        // Generic notification template
        return {
          subject: `Notification from ${platformName}`,
          html: baseLayout(`
            <h1 style="color: #111827; font-size: 24px; margin: 0 0 20px 0;">Notification</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              ${variables.message || 'You have a new notification.'}
            </p>
            ${variables.actionUrl ? `
              <a href="${variables.actionUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Details
              </a>
            ` : ''}
          `),
          text: `Notification\n\n${variables.message || 'You have a new notification.'}`,
        };
    }
  }

  /**
   * Create or update template
   */
  async upsertTemplate(data: {
    key: string;
    name: string;
    description?: string;
    category: EmailCategory;
    subject: string;
    htmlContent: string;
    textContent?: string;
    preheader?: string;
    layout?: string;
    variables: string[];
    orgId?: string | null;
    createdBy?: string;
  }) {
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        key: data.key,
        orgId: data.orgId || null,
      },
      orderBy: {
        version: 'desc',
      },
    });

    const nextVersion = existingTemplate ? existingTemplate.version + 1 : 1;

    return prisma.emailTemplate.create({
      data: {
        ...data,
        version: nextVersion,
        variables: data.variables,
        isDefault: data.orgId === null,
      },
    });
  }
}

export const emailTemplateService = new EmailTemplateService();

