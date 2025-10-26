/**
 * Notifications API Route
 * 
 * GET /api/notifications - Get user notifications (from orders, KYC, etc.)
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

interface Notification {
  id: string;
  type: 'ORDER' | 'KYC' | 'PAYMENT' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userId = session.user.id;
    const notifications: Notification[] = [];

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        currency: { select: { symbol: true } },
        fiatCurrency: { select: { symbol: true } }
      }
    });

    // Convert orders to notifications
    for (const order of recentOrders) {
      let title = '';
      let message = '';
      let type: Notification['type'] = 'ORDER';

      switch (order.status) {
        case 'PENDING':
          title = 'Order Created';
          message = `Your order for ${order.cryptoAmount} ${order.currency.symbol} is awaiting payment`;
          break;
        case 'PAYMENT_PENDING':
          title = 'Payment Received';
          message = `Payment proof received for order ${order.paymentReference}. Awaiting verification`;
          type = 'PAYMENT';
          break;
        case 'PROCESSING':
          title = 'Order Processing';
          message = `Your order ${order.paymentReference} is being processed`;
          break;
        case 'COMPLETED':
          title = 'Order Completed';
          message = `${order.cryptoAmount} ${order.currency.symbol} has been sent to your wallet`;
          break;
        case 'EXPIRED':
          title = 'Order Expired';
          message = `Order ${order.paymentReference} has expired`;
          break;
        case 'CANCELLED':
          title = 'Order Cancelled';
          message = `Order ${order.paymentReference} has been cancelled`;
          break;
        default:
          continue;
      }

      notifications.push({
        id: order.id,
        type,
        title,
        message,
        isRead: false, // All notifications are unread for now (no read tracking without DB)
        createdAt: order.updatedAt.toISOString(),
        link: `/orders/${order.id}`
      });
    }

    // Get KYC session status
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (kycSession) {
      let title = '';
      let message = '';

      switch (kycSession.status) {
        case 'PENDING':
          title = 'KYC Verification Pending';
          message = 'Your KYC verification is being reviewed';
          break;
        case 'APPROVED':
          title = 'KYC Approved';
          message = 'Your KYC verification has been approved. You can now trade!';
          break;
        case 'REJECTED':
          title = 'KYC Rejected';
          message = 'Your KYC verification was rejected. Please contact support';
          break;
      }

      if (title) {
        notifications.push({
          id: kycSession.id,
          type: 'KYC',
          title,
          message,
          isRead: false,
          createdAt: kycSession.updatedAt.toISOString(),
          link: '/kyc'
        });
      }
    }

    // Sort by date (newest first)
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      notifications
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load notifications' },
      { status: 500 }
    );
  }
}


