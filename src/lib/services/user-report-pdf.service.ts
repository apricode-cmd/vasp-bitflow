/**
 * User Report PDF Generation Service
 * 
 * Generates comprehensive user reports for banks and regulatory compliance
 * Based on invoice-pdf.service.ts pattern
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { UserReportDocument, UserReportData } from '@/components/reports/UserReportDocument';

/**
 * Generate PDF report for a user (for banks/regulators)
 * 
 * @param userId - User ID to generate report for
 * @returns Buffer containing PDF data
 * @throws Error if user not found or data incomplete
 */
export async function generateUserReportPDF(userId: string): Promise<Buffer> {
  console.log(`[USER_REPORT] Generating PDF for user: ${userId}`);

  // 1. Fetch user with all related data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      kycSession: true,
      orders: {
        include: {
          currency: true,
          fiatCurrency: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20, // Last 20 orders
      },
      // Note: No direct relation to UserAuditLog in User model
      // We'll fetch it separately below
    },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  console.log(`[USER_REPORT] User found: ${user.email}, Orders: ${user.orders.length}`);

  // 2. Fetch login history from UserAuditLog (separate table)
  const loginHistory = await prisma.userAuditLog.findMany({
    where: {
      userId,
      action: 'LOGIN', // Not 'USER_LOGIN' - it's just 'LOGIN'
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5, // Last 5 logins
    select: {
      createdAt: true,
      context: true, // Contains ipAddress, city, country, etc.
    },
  });

  console.log(`[USER_REPORT] Login history found: ${loginHistory.length} entries`);

  // 3. Fetch company legal settings (for header)
  const legalSettings = await prisma.systemSettings.findMany({
    where: {
      category: 'legal',
    },
  });

  const legalData: Record<string, string> = {};
  legalSettings.forEach(setting => {
    legalData[setting.key] = setting.value;
  });

  // 3. Fetch branding settings (logo, colors)
  const brandSettings = await prisma.systemSettings.findMany({
    where: {
      OR: [
        { key: 'brandName' },
        { key: 'brandLogo' },
        { key: 'primaryColor' },
      ],
    },
  });

  const brandData: Record<string, string> = {};
  brandSettings.forEach(setting => {
    brandData[setting.key] = setting.value;
  });

  console.log(`[USER_REPORT] Settings loaded - Legal: ${Object.keys(legalData).length}, Brand: ${Object.keys(brandData).length}`);

  // Prepare logo URL (must be absolute URL for PDF)
  let logoUrl = brandData.brandLogo;
  if (logoUrl && !logoUrl.startsWith('http')) {
    // Convert relative URL to absolute
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    logoUrl = `${baseUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
  }
  console.log(`[USER_REPORT] Logo URL: ${logoUrl || 'No logo'}`);

  // 4. Calculate financial statistics
  const completedOrders = user.orders.filter(o => o.status === 'COMPLETED');
  const pendingOrders = user.orders.filter(o => o.status === 'PENDING' || o.status === 'PAYMENT_PENDING');
  const processingOrders = user.orders.filter(o => o.status === 'PROCESSING');
  const cancelledOrders = user.orders.filter(o => o.status === 'CANCELLED' || o.status === 'FAILED');
  
  const totalVolume = completedOrders.reduce((sum, o) => sum + Number(o.totalFiat), 0);
  const averageOrderValue = completedOrders.length > 0 ? totalVolume / completedOrders.length : 0;

  // 5. Build report data
  const reportData: UserReportData = {
    // Report metadata
    reportDate: new Date().toISOString(),
    reportId: `USR-${userId.slice(0, 8).toUpperCase()}-${Date.now()}`,

    // Company info (from legal settings + branding)
    companyLegalName: legalData.companyLegalName || 'Apricode Exchange Ltd.',
    companyRegistrationNumber: legalData.companyRegistrationNumber,
    companyTaxNumber: legalData.companyTaxNumber,
    companyLicenseNumber: legalData.companyLicenseNumber,
    companyAddress: legalData.companyAddress,
    companyPhone: legalData.companyPhone,
    companyEmail: legalData.companyEmail,
    companyWebsite: legalData.companyWebsite,
    brandLogo: logoUrl, // Absolute URL to logo
    brandName: brandData.brandName || 'Apricode Exchange',

    // User account info
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    accountStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
    registrationDate: user.createdAt.toISOString(),
    lastLogin: user.lastLogin?.toISOString() || null,

    // Personal information (from profile)
    firstName: user.profile?.firstName || null,
    lastName: user.profile?.lastName || null,
    phoneNumber: user.profile?.phoneNumber || null,
    country: user.profile?.country || null,
    city: user.profile?.city || null,

    // KYC information
    kycStatus: user.kycSession?.status || 'NOT_STARTED',
    kycSubmittedAt: user.kycSession?.submittedAt?.toISOString() || null,
    kycReviewedAt: user.kycSession?.reviewedAt?.toISOString() || null,

    // KYC Details (extended fields from profile)
    dateOfBirth: user.profile?.dateOfBirth ? (typeof user.profile.dateOfBirth === 'string' ? user.profile.dateOfBirth : user.profile.dateOfBirth.toISOString()) : null,
    placeOfBirth: user.profile?.placeOfBirth || null,
    nationality: user.profile?.nationality || null,
    addressStreet: user.profile?.addressStreet || null,
    addressCity: user.profile?.addressCity || null,
    addressRegion: user.profile?.addressRegion || null,
    addressPostalCode: user.profile?.addressPostalCode || null,
    addressCountry: user.profile?.addressCountry || null,
    
    // Identity Document
    idType: user.profile?.idType || null,
    idNumber: user.profile?.idNumber || null,
    idIssuingCountry: user.profile?.idIssuingCountry || null,
    idIssueDate: user.profile?.idIssueDate ? (typeof user.profile.idIssueDate === 'string' ? user.profile.idIssueDate : user.profile.idIssueDate.toISOString()) : null,
    idExpiryDate: user.profile?.idExpiryDate ? (typeof user.profile.idExpiryDate === 'string' ? user.profile.idExpiryDate : user.profile.idExpiryDate.toISOString()) : null,

    // PEP Status
    isPep: user.profile?.isPep || false,
    pepRole: user.profile?.pepRole || null,

    // Employment & Source of Funds
    employmentStatus: user.profile?.employmentStatus || null,
    occupation: user.profile?.occupation || null,
    employerName: user.profile?.employerName || null,
    sourceOfFunds: user.profile?.sourceOfFunds || null,
    sourceOfWealth: user.profile?.sourceOfWealth || null,
    purposeOfAccount: user.profile?.purposeOfAccount || null,
    intendedUse: user.profile?.intendedUse || null,

    // Financial statistics
    totalOrders: user.orders.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    processingOrders: processingOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalVolume,
    averageOrderValue,

    // Transaction history (last 20 orders)
    orders: user.orders.map(order => ({
      id: order.id,
      paymentReference: order.paymentReference,
      date: order.createdAt.toISOString(),
      type: 'BUY', // Currently only buying
      cryptoAmount: order.cryptoAmount,
      cryptoCurrency: order.currencyCode,
      fiatAmount: order.totalFiat,
      fiatCurrency: order.fiatCurrencyCode,
      status: order.status,
    })),

    // Security & login history (from separate UserAuditLog table)
    loginHistory: loginHistory.map(log => {
      // Extract from context JSON
      const context = log.context as any || {};
      const ipAddress = context.ipAddress || 'Unknown';
      const city = context.city;
      const country = context.country;
      const location = city && country ? `${city}, ${country}` : country || 'Unknown';
      
      return {
        date: log.createdAt.toISOString(),
        ipAddress,
        location,
      };
    }),
  };

  // 6. Generate PDF
  console.log(`[USER_REPORT] Generating PDF document...`);
  
  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(UserReportDocument, { data: reportData })
    );

    console.log(`[USER_REPORT] PDF generated successfully: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    console.error('[USER_REPORT] PDF generation error:', error);
    throw new Error('Failed to generate PDF user report');
  }
}

/**
 * Generate report filename
 * 
 * @param userId - User ID
 * @param userEmail - User email for filename
 * @returns Filename in format: user-report-{email}-{date}.pdf
 */
export function generateReportFilename(userId: string, userEmail: string): string {
  const date = new Date().toISOString().split('T')[0];
  const emailPart = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '-');
  return `user-report-${emailPart}-${date}.pdf`;
}

