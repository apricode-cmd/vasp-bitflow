/**
 * GET /api/admin/users/[id]/timeline
 * 
 * Fetch user activity timeline - aggregates events from:
 * - Orders
 * - KYC sessions
 * - Pay-In/Pay-Out
 * - Audit logs (account events)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/formatters';

interface RouteContext {
  params: {
    id: string;
  };
}

interface TimelineEvent {
  id: string;
  type: 'ORDER' | 'KYC' | 'PAY_IN' | 'PAY_OUT' | 'ACCOUNT' | 'LOGIN';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  link?: string;
  metadata?: Record<string, any>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id: userId } = params;

    const [user, orders, kycSession, payIns, payOuts, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          lastLogin: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        select: {
          id: true,
          paymentReference: true,
          status: true,
          cryptoAmount: true,
          totalFiat: true,
          createdAt: true,
          currency: { select: { code: true } },
          fiatCurrency: { select: { code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.kycSession.findFirst({
        where: { userId },
        select: {
          status: true,
          createdAt: true,
          submittedAt: true,
          reviewedAt: true,
        },
      }),
      prisma.payIn.findMany({
        where: { order: { userId } },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          fiatCurrency: { select: { code: true } },
          order: { select: { paymentReference: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.payOut.findMany({
        where: { order: { userId } },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          cryptocurrencyCode: true,
          order: { select: { paymentReference: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: { 
          userId,
          action: { in: ['USER_LOGIN', 'USER_LOGOUT', 'PROFILE_UPDATE', 'PASSWORD_CHANGE'] }
        },
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const events: TimelineEvent[] = [];

    // Account creation
    if (user) {
      events.push({
        id: `account-${user.createdAt}`,
        type: 'ACCOUNT',
        title: 'Account Created',
        description: 'User registered on the platform',
        timestamp: user.createdAt.toISOString(),
        status: 'success',
      });

      // Last login
      if (user.lastLogin) {
        events.push({
          id: `login-${user.lastLogin}`,
          type: 'LOGIN',
          title: 'Last Login',
          description: 'User logged into the platform',
          timestamp: user.lastLogin.toISOString(),
          status: 'info',
        });
      }
    }

    // KYC events
    if (kycSession) {
      events.push({
        id: `kyc-started-${kycSession.createdAt}`,
        type: 'KYC',
        title: 'KYC Started',
        description: 'User started identity verification process',
        timestamp: kycSession.createdAt.toISOString(),
        status: 'info',
        link: `/admin/kyc?userId=${userId}`,
        metadata: {
          status: kycSession.status,
        },
      });

      if (kycSession.submittedAt) {
        events.push({
          id: `kyc-submitted-${kycSession.submittedAt}`,
          type: 'KYC',
          title: 'KYC Submitted',
          description: 'User submitted KYC documents for review',
          timestamp: kycSession.submittedAt.toISOString(),
          status: 'warning',
          link: `/admin/kyc?userId=${userId}`,
        });
      }

      if (kycSession.reviewedAt) {
        const status = kycSession.status === 'APPROVED' ? 'success' : 
                      kycSession.status === 'REJECTED' ? 'error' : 'info';
        events.push({
          id: `kyc-reviewed-${kycSession.reviewedAt}`,
          type: 'KYC',
          title: `KYC ${kycSession.status}`,
          description: `Identity verification ${kycSession.status.toLowerCase()}`,
          timestamp: kycSession.reviewedAt.toISOString(),
          status,
          link: `/admin/kyc?userId=${userId}`,
        });
      }
    }

    // Order events
    orders.forEach((order) => {
      const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
        COMPLETED: 'success',
        PROCESSING: 'warning',
        PAYMENT_PENDING: 'warning',
        PENDING: 'info',
        CANCELLED: 'error',
        FAILED: 'error',
      };

      events.push({
        id: `order-${order.id}`,
        type: 'ORDER',
        title: `Order ${order.paymentReference}`,
        description: `${order.cryptoAmount} ${order.currency.code} - ${formatCurrency(order.totalFiat, order.fiatCurrency.code)}`,
        timestamp: order.createdAt.toISOString(),
        status: statusMap[order.status] || 'info',
        link: `/admin/orders?id=${order.id}`,
        metadata: {
          status: order.status,
        },
      });
    });

    // Pay-In events
    payIns.forEach((payIn) => {
      const statusMap: Record<string, 'success' | 'warning' | 'error'> = {
        VERIFIED: 'success',
        RECEIVED: 'warning',
        FAILED: 'error',
      };

      events.push({
        id: `payin-${payIn.id}`,
        type: 'PAY_IN',
        title: `Payment Received - ${payIn.order?.paymentReference || 'Direct'}`,
        description: `Incoming fiat payment: ${formatCurrency(payIn.amount, payIn.fiatCurrency.code)}`,
        timestamp: payIn.createdAt.toISOString(),
        status: statusMap[payIn.status] || 'info',
        link: `/admin/pay-in?id=${payIn.id}`,
      });
    });

    // Pay-Out events
    payOuts.forEach((payOut) => {
      const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
        CONFIRMED: 'success',
        SENT: 'success',
        PROCESSING: 'warning',
        PENDING: 'info',
        FAILED: 'error',
      };

      events.push({
        id: `payout-${payOut.id}`,
        type: 'PAY_OUT',
        title: `Crypto Sent - ${payOut.order?.paymentReference || 'Direct'}`,
        description: `Outgoing crypto payment: ${payOut.amount} ${payOut.cryptocurrencyCode}`,
        timestamp: payOut.createdAt.toISOString(),
        status: statusMap[payOut.status] || 'info',
        link: `/admin/pay-out?id=${payOut.id}`,
      });
    });

    // Audit log events
    auditLogs.forEach((log) => {
      const actionTitles: Record<string, string> = {
        USER_LOGIN: 'User Login',
        USER_LOGOUT: 'User Logout',
        PROFILE_UPDATE: 'Profile Updated',
        PASSWORD_CHANGE: 'Password Changed',
      };

      // metadata is JSON, try to extract meaningful info
      let description = 'User account activity';
      if (log.metadata && typeof log.metadata === 'object') {
        const meta = log.metadata as any;
        if (meta.ipAddress) {
          description = `From IP: ${meta.ipAddress}`;
        }
      }

      events.push({
        id: `audit-${log.id}`,
        type: 'ACCOUNT',
        title: actionTitles[log.action] || log.action,
        description,
        timestamp: log.createdAt.toISOString(),
        status: 'info',
      });
    });

    // Sort all events by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('❌ Failed to fetch user timeline:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch timeline',
      },
      { status: 500 }
    );
  }
}

