/**
 * Email Data Builders
 * 
 * Builds email template data from database entities.
 * Ensures all URLs are absolute and all data is formatted correctly for emails.
 * 
 * Usage:
 * ```typescript
 * const orderData = await buildOrderEmailData('order123');
 * await sendNotificationEmail({
 *   to: user.email,
 *   templateKey: 'ORDER_CREATED',
 *   data: orderData
 * });
 * ```
 */

import { prisma } from '@/lib/prisma';
import { getEmailUrls, formatEmailDate, formatEmailCurrency, formatEmailCrypto } from '@/lib/utils/email-urls';

/**
 * Build email data for ORDER_CREATED event
 */
export async function buildOrderEmailData(orderId: string) {
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
      blockchain: true,
      paymentMethod: true,
    }
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const emailUrls = getEmailUrls();
  
  // Get user name (fallback to email if profile not complete)
  const userName = order.user.profile?.firstName 
    ? `${order.user.profile.firstName} ${order.user.profile.lastName || ''}`.trim()
    : order.user.email.split('@')[0];

  return {
    // User info
    userName,
    userEmail: order.user.email,
    
    // Order identification
    orderId: order.id,
    orderNumber: order.paymentReference || order.id.slice(0, 8).toUpperCase(),
    orderUrl: emailUrls.order(order.id),
    
    // Amounts (formatted)
    cryptoAmount: order.cryptoAmount.toFixed(8),
    cryptoCurrency: order.currency.symbol,
    cryptoCurrencyName: order.currency.name,
    
    fiatAmount: order.fiatAmount.toFixed(2),
    fiatCurrency: order.fiatCurrency.symbol,
    fiatCurrencyName: order.fiatCurrency.name,
    
    // Exchange rate and fees
    exchangeRate: order.rate.toFixed(2),
    rate: order.rate.toFixed(2),
    fee: order.feeAmount.toFixed(2),
    feePercent: (order.feePercent * 100).toFixed(2),
    totalAmount: order.totalFiat.toFixed(2),
    total: `${order.totalFiat.toFixed(2)} ${order.fiatCurrency.symbol}`,
    
    // Wallet & Blockchain
    walletAddress: order.walletAddress,
    blockchain: order.blockchain?.name || order.blockchainCode || 'N/A',
    blockchainCode: order.blockchainCode || '',
    
    // Payment method
    paymentMethod: order.paymentMethod?.name || 'Bank Transfer',
    paymentMethodCode: order.paymentMethodCode || '',
    
    // Bank details (if available)
    bankDetails: order.paymentMethod ? {
      bankName: order.paymentMethod.bankName || '',
      accountNumber: order.paymentMethod.accountNumber || '',
      iban: order.paymentMethod.iban || '',
      swift: order.paymentMethod.swift || '',
      reference: order.paymentReference,
    } : undefined,
    
    // Timing
    expiresAt: order.expiresAt ? formatEmailDate(order.expiresAt) : '24 hours',
    createdAt: formatEmailDate(order.createdAt),
    
    // Status
    status: order.status,
    
    // Additional URLs
    dashboardUrl: emailUrls.dashboard,
    ordersUrl: emailUrls.orders,
  };
}

/**
 * Build email data for ORDER_COMPLETED event
 */
export async function buildOrderCompletedEmailData(orderId: string) {
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
      blockchain: true,
    }
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = order.user.profile?.firstName 
    ? `${order.user.profile.firstName} ${order.user.profile.lastName || ''}`.trim()
    : order.user.email.split('@')[0];

  return {
    userName,
    userEmail: order.user.email,
    orderId: order.id,
    orderNumber: order.paymentReference || order.id.slice(0, 8).toUpperCase(),
    orderUrl: emailUrls.order(order.id),
    
    // Crypto details
    cryptoCurrency: order.currency.symbol,
    cryptoCurrencyName: order.currency.name,
    amount: order.cryptoAmount.toFixed(8),
    cryptoAmount: order.cryptoAmount.toFixed(8),
    
    // Wallet
    walletAddress: order.walletAddress,
    
    // Transaction
    txHash: order.transactionHash || 'Pending',
    transactionHash: order.transactionHash || 'Pending',
    blockchain: order.blockchain?.name || order.blockchainCode || 'N/A',
    
    // Timing
    completedAt: order.processedAt ? formatEmailDate(order.processedAt) : formatEmailDate(new Date()),
    
    // URLs
    dashboardUrl: emailUrls.dashboard,
  };
}

/**
 * Build email data for KYC_APPROVED event
 */
export async function buildKycApprovedEmailData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      kycSession: true,
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = user.profile?.firstName 
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user.email.split('@')[0];

  return {
    userName,
    userEmail: user.email,
    
    // KYC details
    kycSessionId: user.kycSession?.id || '',
    verificationId: user.kycSession?.verificationId || '',
    verificationLevel: 'BASIC', // Default level
    
    // Timing
    approvedAt: user.kycSession?.reviewedAt 
      ? formatEmailDate(user.kycSession.reviewedAt)
      : formatEmailDate(new Date()),
    
    // URLs
    dashboardUrl: emailUrls.dashboard,
    buyUrl: emailUrls.buy,
    kycUrl: emailUrls.kyc,
  };
}

/**
 * Build email data for KYC_REJECTED event
 */
export async function buildKycRejectedEmailData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      kycSession: true,
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = user.profile?.firstName 
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user.email.split('@')[0];

  return {
    userName,
    userEmail: user.email,
    
    // KYC details
    kycSessionId: user.kycSession?.id || '',
    reason: user.kycSession?.rejectionReason || 'Please review your documents and try again',
    rejectionReason: user.kycSession?.rejectionReason || 'Please review your documents and try again',
    
    // Timing
    rejectedAt: user.kycSession?.reviewedAt 
      ? formatEmailDate(user.kycSession.reviewedAt)
      : formatEmailDate(new Date()),
    
    // URLs
    kycUrl: emailUrls.kyc,
    dashboardUrl: emailUrls.dashboard,
  };
}

/**
 * Build email data for WELCOME_EMAIL event
 */
export async function buildWelcomeEmailData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = user.profile?.firstName 
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user.email.split('@')[0];

  return {
    userName,
    userEmail: user.email,
    
    // URLs for onboarding
    loginUrl: emailUrls.login,
    dashboardUrl: emailUrls.dashboard,
    kycUrl: emailUrls.kyc,
    profileUrl: emailUrls.profile,
    buyUrl: emailUrls.buy,
  };
}

/**
 * Build email data for PASSWORD_RESET event
 */
export async function buildPasswordResetEmailData(userId: string, resetToken: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = user.profile?.firstName 
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user.email.split('@')[0];

  return {
    userName,
    userEmail: user.email,
    
    // Reset link
    resetUrl: emailUrls.resetPassword(resetToken),
    
    // Expiration
    expiresIn: '1 hour',
    
    // URLs
    loginUrl: emailUrls.login,
    dashboardUrl: emailUrls.dashboard,
  };
}

/**
 * Build email data for EMAIL_VERIFICATION event
 */
export async function buildEmailVerificationData(userId: string, verificationToken: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = user.profile?.firstName 
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user.email.split('@')[0];

  return {
    userName,
    userEmail: user.email,
    
    // Verification link
    verifyUrl: emailUrls.verifyEmail(verificationToken),
    verificationUrl: emailUrls.verifyEmail(verificationToken),
    
    // Expiration
    expiresIn: '24 hours',
    
    // URLs
    loginUrl: emailUrls.login,
    dashboardUrl: emailUrls.dashboard,
  };
}

/**
 * Build email data for ADMIN_INVITED event
 */
export async function buildAdminInviteEmailData(adminId: string, setupToken: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  });

  if (!admin) {
    throw new Error(`Admin not found: ${adminId}`);
  }

  const emailUrls = getEmailUrls();
  
  const adminName = admin.firstName 
    ? `${admin.firstName} ${admin.lastName || ''}`.trim()
    : admin.workEmail.split('@')[0];

  return {
    adminName,
    adminEmail: admin.workEmail,
    
    // Setup link (universal setup page - user chooses method)
    setupUrl: emailUrls.adminSetup(setupToken, admin.workEmail),
    
    // Role
    role: admin.role,
    
    // Expiration
    expiresIn: '15 minutes',
    
    // URLs
    adminDashboard: emailUrls.adminDashboard,
  };
}

/**
 * Build email data for PAYMENT_RECEIVED event
 */
export async function buildPaymentReceivedEmailData(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: {
          profile: true
        }
      },
      fiatCurrency: true,
    }
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = order.user.profile?.firstName 
    ? `${order.user.profile.firstName} ${order.user.profile.lastName || ''}`.trim()
    : order.user.email.split('@')[0];

  return {
    userName,
    userEmail: order.user.email,
    
    // Order
    orderId: order.id,
    orderNumber: order.paymentReference || order.id.slice(0, 8).toUpperCase(),
    orderUrl: emailUrls.order(order.id),
    
    // Payment
    amount: order.totalFiat.toFixed(2),
    currency: order.fiatCurrency.symbol,
    
    // URLs
    dashboardUrl: emailUrls.dashboard,
  };
}

/**
 * Build email data for ORDER_CANCELLED event
 */
export async function buildOrderCancelledEmailData(orderId: string, reason?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: {
          profile: true
        }
      },
      fiatCurrency: true,
    }
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const emailUrls = getEmailUrls();
  
  const userName = order.user.profile?.firstName 
    ? `${order.user.profile.firstName} ${order.user.profile.lastName || ''}`.trim()
    : order.user.email.split('@')[0];

  return {
    userName,
    userEmail: order.user.email,
    
    // Order
    orderId: order.id,
    orderNumber: order.paymentReference || order.id.slice(0, 8).toUpperCase(),
    
    // Cancellation
    reason: reason || order.adminNotes || 'Order was cancelled',
    cancelledAt: formatEmailDate(new Date()),
    
    // Refund info (if applicable)
    refundAmount: order.totalFiat.toFixed(2),
    refundCurrency: order.fiatCurrency.symbol,
    
    // URLs
    dashboardUrl: emailUrls.dashboard,
    buyUrl: emailUrls.buy,
  };
}

