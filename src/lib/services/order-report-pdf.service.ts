/**
 * Order Report PDF Generation Service
 * 
 * Generates comprehensive order reports for compliance and audit purposes
 * Based on user-report-pdf.service.ts pattern
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { OrderReportDocument, OrderReportData } from '@/components/reports/OrderReportDocument';

/**
 * Generate PDF report for an order
 * 
 * @param orderId - Order ID to generate report for
 * @returns Buffer containing PDF data
 * @throws Error if order not found or data incomplete
 */
export async function generateOrderReportPDF(orderId: string): Promise<Buffer> {
  console.log(`[ORDER_REPORT] Generating PDF for order: ${orderId}`);

  // 1. Fetch order with all related data
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: {
          profile: true,
          kycSession: true,
        },
      },
      currency: true,
      fiatCurrency: true,
      paymentMethod: {
        include: {
          paymentAccount: true,
        },
      },
      userWallet: {
        include: {
          currency: true,
          blockchain: true,
        },
      },
      payIn: {
        include: {
          paymentMethod: {
            include: {
              paymentAccount: true,
            },
          },
        },
      },
      payOut: {
        include: {
          network: true,
        },
      },
      statusHistory: {
        orderBy: {
          changedAt: 'asc',
        },
        include: {
          changedByAdmin: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  console.log(`[ORDER_REPORT] Order found: ${order.paymentReference}, Status: ${order.status}`);

  // 2. Fetch company legal settings
  const legalSettings = await prisma.systemSettings.findMany({
    where: {
      category: 'legal',
    },
  });

  const legalData: Record<string, string> = {};
  legalSettings.forEach(setting => {
    legalData[setting.key] = setting.value;
  });

  // 3. Fetch branding settings
  const brandingSettings = await prisma.systemSettings.findMany({
    where: {
      category: 'branding',
    },
  });

  const brandData: Record<string, string> = {};
  brandingSettings.forEach(setting => {
    brandData[setting.key] = setting.value;
  });

  // Logo URL - absolute URL for PDF rendering
  const logoUrl = brandData.brandLogo ? (
    brandData.brandLogo.startsWith('http') 
      ? brandData.brandLogo 
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${brandData.brandLogo}`
  ) : null;

  console.log(`[ORDER_REPORT] Company info: ${legalData.companyLegalName}, Logo: ${logoUrl ? 'Yes' : 'No'}`);

  // 4. Build timeline from status history
  const timeline = order.statusHistory.map(history => ({
    date: history.changedAt.toISOString(),
    status: history.newStatus,
    description: history.notes || `Order status changed from ${history.oldStatus} to ${history.newStatus}`,
    actor: history.changedByAdmin?.email || 'System',
  }));

  // Add initial creation event if not in history
  if (!timeline.some(t => t.status === 'PENDING')) {
    timeline.unshift({
      date: order.createdAt.toISOString(),
      status: 'PENDING',
      description: 'Order created by customer',
      actor: order.user.email,
    });
  }

  // 5. Build report data
  const reportData: OrderReportData = {
    // Report metadata
    reportDate: new Date().toISOString(),
    reportId: `ORD-${order.paymentReference}-${Date.now()}`,

    // Company info
    companyLegalName: legalData.companyLegalName || 'Apricode Exchange Ltd.',
    companyRegistrationNumber: legalData.companyRegistrationNumber || null,
    companyTaxNumber: legalData.companyTaxNumber || null,
    companyLicenseNumber: legalData.companyLicenseNumber || null,
    companyAddress: legalData.companyAddress || null,
    companyPhone: legalData.companyPhone || null,
    companyEmail: legalData.companyEmail || null,
    companyWebsite: legalData.companyWebsite || null,
    brandLogo: logoUrl,
    brandName: brandData.brandName || 'Apricode Exchange',
    primaryBrandColor: brandData.primaryBrandColor || '#3b82f6',

    // Order information
    orderId: order.id,
    paymentReference: order.paymentReference,
    orderStatus: order.status,
    orderType: 'BUY', // Currently only buying
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    expiresAt: order.expiresAt?.toISOString() || null,
    completedAt: order.completedAt?.toISOString() || null,

    // Customer information
    customerId: order.user.id,
    customerEmail: order.user.email,
    customerName: order.user.profile?.firstName && order.user.profile?.lastName 
      ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
      : order.user.email,
    customerPhone: order.user.profile?.phoneNumber || null,
    customerCountry: order.user.profile?.country || null,
    kycStatus: order.user.kycSession?.status || 'NOT_STARTED',

    // Financial details
    cryptoCurrency: order.currencyCode,
    cryptoAmount: order.cryptoAmount.toString(),
    fiatCurrency: order.fiatCurrencyCode,
    fiatAmount: order.fiatAmount.toString(),
    exchangeRate: order.exchangeRate.toString(),
    platformFee: order.platformFee.toString(),
    totalFiat: order.totalFiat.toString(),

    // Payment details
    paymentMethodName: order.paymentMethod?.name || null,
    paymentAccountName: order.paymentMethod?.paymentAccount?.accountName || null,
    paymentAccountDetails: order.paymentMethod?.paymentAccount 
      ? `${order.paymentMethod.paymentAccount.accountType || 'Bank'} - ${order.paymentMethod.paymentAccount.accountNumber || 'N/A'}`
      : null,
    
    // Wallet details
    walletAddress: order.userWallet?.address || null,
    walletLabel: order.userWallet?.label || null,
    blockchain: order.userWallet?.blockchain?.name || null,

    // PayIn details
    payInStatus: order.payIn?.status || null,
    payInAmount: order.payIn?.amount?.toString() || null,
    payInCurrency: order.payIn?.currency || null,
    payInReference: order.payIn?.reference || null,
    payInReceivedAt: order.payIn?.receivedAt?.toISOString() || null,

    // PayOut details
    payOutStatus: order.payOut?.status || null,
    payOutAmount: order.payOut?.amount?.toString() || null,
    payOutCurrency: order.payOut?.currency || null,
    payOutTxHash: order.payOut?.txHash || null,
    payOutSentAt: order.payOut?.sentAt?.toISOString() || null,

    // Timeline
    timeline,

    // Notes
    adminNotes: order.internalNote || null,
    customerNotes: order.notes || null,
  };

  // 6. Generate PDF
  console.log(`[ORDER_REPORT] Generating PDF document...`);
  
  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(OrderReportDocument, { data: reportData })
    );

    console.log(`[ORDER_REPORT] PDF generated successfully: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    console.error('[ORDER_REPORT] PDF generation error:', error);
    throw new Error('Failed to generate PDF order report');
  }
}

/**
 * Generate report filename
 * 
 * @param orderId - Order ID
 * @param paymentReference - Payment reference for filename
 * @returns Filename in format: order-report-{reference}-{date}.pdf
 */
export function generateOrderReportFilename(orderId: string, paymentReference: string): string {
  const date = new Date().toISOString().split('T')[0];
  const refPart = paymentReference.replace(/[^a-zA-Z0-9]/g, '-');
  return `order-report-${refPart}-${date}.pdf`;
}

