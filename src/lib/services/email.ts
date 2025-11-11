/**
 * Email Service (DEPRECATED)
 * 
 * ⚠️ DEPRECATED: Use email-notification.service.ts instead
 * 
 * This file contains old email functions with hardcoded HTML templates.
 * All email sending should now use:
 * - email-notification.service.ts (sends emails with templates from admin panel)
 * - notification.service.ts (queues notifications and processes them)
 * 
 * @deprecated Use email-notification.service.ts
 */

import { Resend } from 'resend';
import { config } from '@/lib/config';

const resend = new Resend(config.email.apiKey);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Resend
 */
async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    await resend.emails.send({
      from: config.email.from,
      to,
      subject,
      html
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Sends welcome email after registration
 */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Welcome to Apricode Exchange!</h1>
      <p>Hi ${firstName},</p>
      <p>Thank you for registering with Apricode Exchange. We're excited to have you on board!</p>
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Complete KYC verification to start buying cryptocurrency</li>
        <li>Browse our supported cryptocurrencies: BTC, ETH, USDT, SOL</li>
        <li>Place your first order with bank transfer</li>
      </ol>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>Apricode Exchange Team</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to Apricode Exchange',
    html
  });
}

/**
 * Sends KYC status update email
 */
export async function sendKycStatusEmail(
  to: string,
  firstName: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
): Promise<boolean> {
  const isApproved = status === 'APPROVED';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: ${isApproved ? '#10b981' : '#ef4444'};">
        KYC Verification ${isApproved ? 'Approved' : 'Rejected'}
      </h1>
      <p>Hi ${firstName},</p>
      ${isApproved
        ? `
        <p>Great news! Your KYC verification has been approved.</p>
        <p>You can now start buying cryptocurrency on our platform.</p>
        <p><a href="${config.auth.url}/buy" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Start Buying Crypto</a></p>
        `
        : `
        <p>Unfortunately, your KYC verification was not approved.</p>
        ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
        <p>Please contact our support team for more information.</p>
        `
      }
      <p>Best regards,<br>Apricode Exchange Team</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `KYC Verification ${isApproved ? 'Approved' : 'Rejected'}`,
    html
  });
}

/**
 * Sends order confirmation email
 */
export async function sendOrderConfirmationEmail(
  to: string,
  firstName: string,
  orderDetails: {
    orderId: string;
    amount: number;
    currency: string;
    totalFiat: number;
    fiatCurrency: string;
    bankName: string;
    iban: string;
  }
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Order Created Successfully</h1>
      <p>Hi ${firstName},</p>
      <p>Your order has been created. Please transfer the funds to complete your purchase.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Order Details</h2>
        <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
        <p><strong>Amount:</strong> ${orderDetails.amount} ${orderDetails.currency}</p>
        <p><strong>Total to Pay:</strong> ${orderDetails.totalFiat} ${orderDetails.fiatCurrency}</p>
      </div>

      <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Payment Details</h2>
        <p><strong>Bank Name:</strong> ${orderDetails.bankName}</p>
        <p><strong>IBAN:</strong> ${orderDetails.iban}</p>
        <p><strong>Reference:</strong> ${orderDetails.orderId.slice(0, 8)}</p>
      </div>

      <p><strong>Important:</strong> Please include the reference number in your bank transfer.</p>
      <p>After making the payment, upload the proof in your order details page.</p>
      
      <p><a href="${config.auth.url}/orders/${orderDetails.orderId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Order</a></p>

      <p>Best regards,<br>Apricode Exchange Team</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Order Confirmation - ${orderDetails.orderId.slice(0, 8)}`,
    html
  });
}

/**
 * Sends order status update email
 */
export async function sendOrderStatusEmail(
  to: string,
  firstName: string,
  orderDetails: {
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    transactionHash?: string;
  }
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Order Status Update</h1>
      <p>Hi ${firstName},</p>
      <p>Your order status has been updated to: <strong>${orderDetails.status}</strong></p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
        <p><strong>Amount:</strong> ${orderDetails.amount} ${orderDetails.currency}</p>
        ${orderDetails.transactionHash 
          ? `<p><strong>Transaction Hash:</strong> ${orderDetails.transactionHash}</p>` 
          : ''
        }
      </div>

      ${orderDetails.status === 'COMPLETED'
        ? '<p style="color: #10b981; font-weight: bold;">✓ Cryptocurrency has been sent to your wallet!</p>'
        : '<p>You can track your order status in your dashboard.</p>'
      }
      
      <p><a href="${config.auth.url}/orders/${orderDetails.orderId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Order</a></p>

      <p>Best regards,<br>Apricode Exchange Team</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Order ${orderDetails.status} - ${orderDetails.orderId.slice(0, 8)}`,
    html
  });
}

