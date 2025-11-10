/**
 * Preset Email Templates
 * 
 * Ready-to-use email templates for common events
 */

import { getBaseEmailLayout, getMinimalEmailLayout } from './base-layout';

export interface EmailTemplate {
  key: string;
  name: string;
  description: string;
  category: 'TRANSACTIONAL' | 'NOTIFICATION' | 'MARKETING' | 'SYSTEM' | 'COMPLIANCE';
  subject: string;
  preheader: string;
  htmlContent: string;
  variables: string[];
  layout: 'default' | 'minimal';
}

export const emailTemplatePresets: EmailTemplate[] = [
  // ORDER TEMPLATES
  {
    key: 'ORDER_CREATED',
    name: 'Order Created',
    description: 'Sent when a new order is created',
    category: 'TRANSACTIONAL',
    subject: 'Order #{{orderId}} Created Successfully',
    preheader: 'Your cryptocurrency purchase order has been created',
    layout: 'default',
    variables: ['orderId', 'amount', 'currency', 'cryptoCurrency', 'rate', 'total', 'userName'],
    htmlContent: getBaseEmailLayout(`
      <h1 style="color: #333; margin-bottom: 10px;">Order Created Successfully! 🎉</h1>
      <p>Hi {{userName}},</p>
      <p>Your order has been created successfully. Here are the details:</p>
      
      <div class="info-box">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0;"><strong>Order ID:</strong></td>
            <td style="padding: 5px 0; text-align: right;">#{{orderId}}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Amount:</strong></td>
            <td style="padding: 5px 0; text-align: right;">{{amount}} {{currency}}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Cryptocurrency:</strong></td>
            <td style="padding: 5px 0; text-align: right;">{{cryptoCurrency}}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Exchange Rate:</strong></td>
            <td style="padding: 5px 0; text-align: right;">{{rate}}</td>
          </tr>
          <tr style="border-top: 2px solid #dee2e6;">
            <td style="padding: 10px 0;"><strong>Total:</strong></td>
            <td style="padding: 10px 0; text-align: right;"><strong>{{total}} {{currency}}</strong></td>
          </tr>
        </table>
      </div>
      
      <p>Please proceed with the payment to complete your order.</p>
      
      <a href="{{orderUrl}}" class="button">View Order Details</a>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        <strong>Next Steps:</strong><br>
        1. Complete the payment using the provided bank details<br>
        2. Wait for payment confirmation<br>
        3. Receive your cryptocurrency
      </p>
    `)
  },
  
  {
    key: 'ORDER_COMPLETED',
    name: 'Order Completed',
    description: 'Sent when an order is successfully completed',
    category: 'TRANSACTIONAL',
    subject: 'Order #{{orderId}} Completed - Crypto Sent! 🚀',
    preheader: 'Your cryptocurrency has been sent to your wallet',
    layout: 'default',
    variables: ['orderId', 'cryptoCurrency', 'amount', 'walletAddress', 'txHash', 'userName'],
    htmlContent: getBaseEmailLayout(`
      <h1 style="color: #198754;">Order Completed Successfully! ✅</h1>
      <p>Hi {{userName}},</p>
      <p>Great news! Your order has been completed and your cryptocurrency has been sent to your wallet.</p>
      
      <div class="success-box">
        <p style="margin: 0 0 10px 0;"><strong>Transaction Details:</strong></p>
        <p style="margin: 5px 0;"><strong>Order ID:</strong> #{{orderId}}</p>
        <p style="margin: 5px 0;"><strong>Cryptocurrency:</strong> {{cryptoCurrency}}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> {{amount}}</p>
        <p style="margin: 5px 0;"><strong>Wallet Address:</strong> {{walletAddress}}</p>
        ${'{'}{{#if txHash}}
        <p style="margin: 5px 0;"><strong>Transaction Hash:</strong> {{txHash}}</p>
        ${'{{'}}/if}}
      </div>
      
      <p>You can now check your wallet balance. The transaction should be visible on the blockchain.</p>
      
      <a href="{{orderUrl}}" class="button">View Order Details</a>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Thank you for choosing {{brandName}}! We hope to serve you again soon.
      </p>
    `)
  },

  // KYC TEMPLATES
  {
    key: 'KYC_APPROVED',
    name: 'KYC Approved',
    description: 'Sent when KYC verification is approved',
    category: 'COMPLIANCE',
    subject: 'KYC Verification Approved ✓',
    preheader: 'Your identity has been verified successfully',
    layout: 'default',
    variables: ['userName', 'verificationLevel'],
    htmlContent: getBaseEmailLayout(`
      <h1 style="color: #198754;">KYC Verification Approved! ✓</h1>
      <p>Hi {{userName}},</p>
      <p>Congratulations! Your identity verification has been approved.</p>
      
      <div class="success-box">
        <p style="margin: 0;"><strong>Verification Level:</strong> {{verificationLevel}}</p>
      </div>
      
      <p>You can now:</p>
      <ul>
        <li>Purchase cryptocurrency</li>
        <li>Access all platform features</li>
        <li>Enjoy higher transaction limits</li>
      </ul>
      
      <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Thank you for completing the verification process!
      </p>
    `)
  },

  {
    key: 'KYC_REJECTED',
    name: 'KYC Rejected',
    description: 'Sent when KYC verification is rejected',
    category: 'COMPLIANCE',
    subject: 'KYC Verification - Additional Information Required',
    preheader: 'We need additional information to verify your identity',
    layout: 'default',
    variables: ['userName', 'rejectionReason'],
    htmlContent: getBaseEmailLayout(`
      <h1 style="color: #dc3545;">Additional Information Required</h1>
      <p>Hi {{userName}},</p>
      <p>We were unable to verify your identity with the information provided.</p>
      
      <div class="warning-box">
        <p style="margin: 0;"><strong>Reason:</strong> {{rejectionReason}}</p>
      </div>
      
      <p>Please review the reason above and submit updated documents or information.</p>
      
      <a href="{{kycUrl}}" class="button">Resubmit Documents</a>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        If you have any questions, please contact our support team at {{supportEmail}}.
      </p>
    `)
  },

  // SYSTEM TEMPLATES
  {
    key: 'WELCOME_EMAIL',
    name: 'Welcome Email',
    description: 'Sent to new users after registration',
    category: 'SYSTEM',
    subject: 'Welcome to {{brandName}}! 🎉',
    preheader: 'Get started with cryptocurrency trading',
    layout: 'default',
    variables: ['userName', 'loginUrl'],
    htmlContent: getBaseEmailLayout(`
      <h1 style="color: {{primaryColor}};">Welcome to {{brandName}}! 🎉</h1>
      <p>Hi {{userName}},</p>
      <p>Thank you for joining {{brandName}}! We're excited to have you on board.</p>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>Get Started:</strong></p>
        <ol style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Complete KYC verification</li>
          <li>Add payment method</li>
          <li>Make your first purchase</li>
        </ol>
      </div>
      
      <a href="{{loginUrl}}" class="button">Go to Dashboard</a>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Need help? Our support team is available 24/7 at {{supportEmail}}.
      </p>
    `)
  },

  {
    key: 'PASSWORD_RESET',
    name: 'Password Reset',
    description: 'Sent when user requests password reset',
    category: 'SYSTEM',
    subject: 'Reset Your Password',
    preheader: 'Click to reset your password',
    layout: 'minimal',
    variables: ['userName', 'resetUrl', 'expiresIn'],
    htmlContent: getMinimalEmailLayout(`
      <h2>Reset Your Password</h2>
      <p>Hi {{userName}},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      
      <p style="color: #6c757d; font-size: 14px;">
        This link will expire in {{expiresIn}}. If you didn't request this, please ignore this email.
      </p>
    `)
  },

  {
    key: 'EMAIL_VERIFICATION',
    name: 'Email Verification',
    description: 'Sent to verify user email address',
    category: 'SYSTEM',
    subject: 'Verify Your Email Address',
    preheader: 'Please verify your email to continue',
    layout: 'minimal',
    variables: ['userName', 'verificationUrl', 'verificationCode'],
    htmlContent: getMinimalEmailLayout(`
      <h2>Verify Your Email</h2>
      <p>Hi {{userName}},</p>
      <p>Please verify your email address by clicking the button below:</p>
      
      <a href="{{verificationUrl}}" class="button">Verify Email</a>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
        Or use this verification code: <strong>{{verificationCode}}</strong>
      </p>
    `)
  },

  // PAYMENT TEMPLATES
  {
    key: 'PAYMENT_RECEIVED',
    name: 'Payment Received',
    description: 'Sent when payment is confirmed',
    category: 'TRANSACTIONAL',
    subject: 'Payment Received for Order #{{orderId}}',
    preheader: 'Your payment has been confirmed',
    layout: 'default',
    variables: ['orderId', 'amount', 'currency', 'userName'],
    htmlContent: getBaseEmailLayout(`
      <h1 style="color: #198754;">Payment Received! ✅</h1>
      <p>Hi {{userName}},</p>
      <p>We have received your payment for order #{{orderId}}.</p>
      
      <div class="success-box">
        <p style="margin: 0;"><strong>Amount:</strong> {{amount}} {{currency}}</p>
      </div>
      
      <p>Your order is now being processed. We'll send you another email once your cryptocurrency has been sent.</p>
      
      <a href="{{orderUrl}}" class="button">Track Order</a>
    `)
  },

  // NOTIFICATION TEMPLATES
  {
    key: 'ORDER_STATUS_UPDATE',
    name: 'Order Status Update',
    description: 'Generic order status update',
    category: 'NOTIFICATION',
    subject: 'Order #{{orderId}} Status Update',
    preheader: 'Your order status has been updated',
    layout: 'default',
    variables: ['orderId', 'status', 'statusMessage', 'userName'],
    htmlContent: getBaseEmailLayout(`
      <h1>Order Status Update</h1>
      <p>Hi {{userName}},</p>
      <p>Your order #{{orderId}} status has been updated to: <strong>{{status}}</strong></p>
      
      <div class="info-box">
        <p style="margin: 0;">{{statusMessage}}</p>
      </div>
      
      <a href="{{orderUrl}}" class="button">View Order</a>
    `)
  }
];

// Helper function to get template by key
export function getTemplateByKey(key: string): EmailTemplate | undefined {
  return emailTemplatePresets.find(t => t.key === key);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return emailTemplatePresets.filter(t => t.category === category);
}

