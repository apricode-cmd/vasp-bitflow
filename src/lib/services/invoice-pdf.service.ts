/**
 * Invoice PDF Generation Service
 * 
 * Handles PDF invoice generation for orders using @react-pdf/renderer
 * Fetches order data, company settings, and bank details to create professional invoices
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { InvoiceDocument, InvoiceData } from '@/components/invoice/InvoiceDocument';

/**
 * Generate PDF invoice for an order
 * 
 * @param orderId - Order ID to generate invoice for
 * @returns Buffer containing PDF data
 * @throws Error if order not found or data incomplete
 */
export async function generateInvoicePDF(orderId: string): Promise<Buffer> {
  console.log(`[INVOICE] Generating PDF for order: ${orderId}`);

  // 1. Fetch order with all related data
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: {
          profile: true
        }
      },
      currency: true,
      fiatCurrency: true,
      paymentMethod: {
        include: {
          bankAccount: true
        }
      }
    }
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  console.log(`[INVOICE] Order found: ${order.id}, Status: ${order.status}`);

  // 2. Fetch company legal settings
  const legalSettings = await prisma.systemSettings.findMany({
    where: {
      category: 'legal'
    }
  });

  const legalData: Record<string, string> = {};
  legalSettings.forEach(setting => {
    legalData[setting.key] = setting.value;
  });

  console.log(`[INVOICE] Legal settings loaded: ${Object.keys(legalData).length} fields`);

  // 3. Get bank details (from payment method or fallback to active bank details)
  let bankDetails = order.paymentMethod?.bankAccount;
  
  if (!bankDetails) {
    // Fallback: get active bank details for the fiat currency
    bankDetails = await prisma.bankDetails.findFirst({
      where: {
        currency: order.fiatCurrencyCode,
        isActive: true
      },
      orderBy: {
        priority: 'desc'
      }
    });
  }

  console.log(`[INVOICE] Bank details: ${bankDetails ? 'Found' : 'Not available'}`);

  // 4. Build invoice data
  const invoiceData: InvoiceData = {
    // Order info
    orderId: order.id,
    orderDate: order.createdAt.toISOString(),
    status: order.status,

    // Company info (from legal settings)
    companyLegalName: legalData.companyLegalName || 'Apricode Exchange Ltd.',
    companyRegistrationNumber: legalData.companyRegistrationNumber,
    companyTaxNumber: legalData.companyTaxNumber,
    companyLicenseNumber: legalData.companyLicenseNumber,
    companyAddress: legalData.companyAddress,
    companyPhone: legalData.companyPhone,
    companyEmail: legalData.companyEmail,
    companyWebsite: legalData.companyWebsite,

    // Customer info
    customerName: order.user.profile
      ? `${order.user.profile.firstName || ''} ${order.user.profile.lastName || ''}`.trim()
      : order.user.email,
    customerEmail: order.user.email,
    customerAddress: order.user.profile?.address,
    customerCountry: order.user.profile?.country,

    // Order details
    cryptoCurrency: order.currencyCode,
    cryptoAmount: order.cryptoAmount,
    fiatCurrency: order.fiatCurrencyCode,
    exchangeRate: order.rate, // Changed from exchangeRate to rate
    subtotal: order.fiatAmount,
    platformFee: order.feeAmount,
    platformFeePercent: order.feePercent,
    totalAmount: order.totalFiat,

    // Payment info
    bankName: bankDetails?.bankName,
    accountHolder: bankDetails?.accountHolder,
    iban: bankDetails?.iban,
    swift: bankDetails?.swift || undefined,
    paymentReference: order.paymentReference,

    // Wallet info
    walletAddress: order.walletAddress,
    blockchainNetwork: order.currency.name // e.g., "Bitcoin", "Ethereum"
  };

  // 5. Generate PDF
  console.log(`[INVOICE] Generating PDF document...`);
  
  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoiceDocument, { data: invoiceData })
    );

    console.log(`[INVOICE] PDF generated successfully: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    console.error('[INVOICE] PDF generation error:', error);
    throw new Error('Failed to generate PDF invoice');
  }
}

/**
 * Generate invoice filename
 * 
 * @param orderId - Order ID
 * @returns Filename in format: invoice-{orderId}-{timestamp}.pdf
 */
export function generateInvoiceFilename(orderId: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  // Remove quotes to prevent file extension issues
  return `invoice-${orderId}-${timestamp}.pdf`.replace(/"/g, '');
}

/**
 * Validate if order is eligible for invoice generation
 * 
 * @param orderId - Order ID to validate
 * @returns true if order can have invoice generated
 * @throws Error with reason if not eligible
 */
export async function validateInvoiceEligibility(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true
    }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Allow invoice generation for all orders except CANCELLED
  // (even PENDING orders can have invoices for payment instructions)
  if (order.status === 'CANCELLED') {
    throw new Error('Cannot generate invoice for cancelled orders');
  }

  return true;
}

