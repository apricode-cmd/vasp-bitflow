/**
 * Admin Notifications API
 * 
 * GET: Get admin's notifications (from AdminAuditLog - critical actions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity'); // INFO, WARNING, CRITICAL

    // Get critical audit logs as notifications for admins
    // These are important system events that admins should be aware of
    const where: any = {
      severity: severity ? severity : { in: ['WARNING', 'CRITICAL'] } // Only important events
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          severity: true,
          adminEmail: true,
          adminRole: true,
          context: true,
          createdAt: true,
          readBy: {
            where: {
              adminId: session.user.id
            },
            select: {
              readAt: true
            }
          }
        }
      }),
      // Count unread notifications (not in readBy for current admin)
      prisma.adminAuditLog.count({
        where: {
          severity: { in: ['WARNING', 'CRITICAL'] },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          readBy: {
            none: {
              adminId: session.user.id
            }
          }
        }
      })
    ]);

    // Transform audit logs to notification format
    const formattedNotifications = notifications.map(log => ({
      id: log.id,
      eventKey: log.action,
      title: formatNotificationTitle(log.action, log.entityType),
      message: formatNotificationMessage(log),
      severity: log.severity,
      actionUrl: getActionUrl(log.entityType, log.entityId),
      adminEmail: log.adminEmail,
      adminRole: log.adminRole,
      createdAt: log.createdAt,
      metadata: log.context,
      isRead: log.readBy.length > 0,
      readAt: log.readBy[0]?.readAt || null
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// Helper functions
function formatNotificationTitle(action: string, entity: string): string {
  const actionMap: Record<string, string> = {
    'ADMIN_INVITED': 'New Administrator Invited',
    'ADMIN_SUSPENDED': 'Administrator Suspended',
    'ADMIN_TERMINATED': 'Administrator Terminated',
    'ADMIN_ROLE_CHANGED': 'Administrator Role Changed',
    'ORDER_STATUS_CHANGED': 'Order Status Changed',
    'KYC_APPROVED': 'KYC Verification Approved',
    'KYC_REJECTED': 'KYC Verification Rejected',
    'PAYMENT_ACCOUNT_CREATED': 'Payment Account Created',
    'PAYMENT_ACCOUNT_DELETED': 'Payment Account Deleted',
    'API_KEY_GENERATED': 'API Key Generated',
    'API_KEY_REVOKED': 'API Key Revoked',
    'INTEGRATION_UPDATED': 'Integration Settings Updated',
    'SETTINGS_UPDATED': 'System Settings Updated',
    'USER_BLOCKED': 'User Account Blocked',
    'USER_UNBLOCKED': 'User Account Unblocked',
  };

  return actionMap[action] || `${entity} ${action.replace(/_/g, ' ')}`;
}

function formatNotificationMessage(log: any): string {
  const { action, entityType, adminEmail, context } = log;
  const metadata = context || {};

  if (action === 'ADMIN_INVITED') {
    return `${adminEmail} invited a new administrator: ${metadata?.targetAdmin || 'Unknown'}`;
  }
  
  if (action === 'ADMIN_SUSPENDED') {
    return `${adminEmail} suspended administrator: ${metadata?.targetAdmin || 'Unknown'}`;
  }
  
  if (action === 'ADMIN_TERMINATED') {
    return `${adminEmail} terminated administrator: ${metadata?.targetAdmin || 'Unknown'}`;
  }
  
  if (action === 'ADMIN_ROLE_CHANGED') {
    return `${adminEmail} changed role for ${metadata?.targetAdmin || 'Unknown'} from ${metadata?.oldRole || 'Unknown'} to ${metadata?.newRole || 'Unknown'}`;
  }
  
  if (action === 'ORDER_STATUS_CHANGED') {
    return `${adminEmail} changed order status from ${metadata?.oldStatus || 'Unknown'} to ${metadata?.newStatus || 'Unknown'}`;
  }
  
  if (action === 'KYC_APPROVED') {
    return `${adminEmail} approved KYC for user ${metadata?.userId || 'Unknown'}`;
  }
  
  if (action === 'KYC_REJECTED') {
    return `${adminEmail} rejected KYC for user ${metadata?.userId || 'Unknown'}`;
  }
  
  if (action === 'API_KEY_GENERATED') {
    return `${adminEmail} generated a new API key`;
  }
  
  if (action === 'API_KEY_REVOKED') {
    return `${adminEmail} revoked an API key`;
  }
  
  if (action === 'INTEGRATION_UPDATED') {
    return `${adminEmail} updated integration settings for ${metadata?.service || 'Unknown'}`;
  }
  
  if (action === 'USER_BLOCKED') {
    return `${adminEmail} blocked user account: ${metadata?.userEmail || 'Unknown'}`;
  }

  return `${adminEmail} performed ${action.replace(/_/g, ' ').toLowerCase()} on ${entityType}`;
}

function getActionUrl(entity: string, entityId: string | null): string | null {
  if (!entityId) return null;

  const urlMap: Record<string, string> = {
    'Admin': `/admin/admins`,
    'Order': `/admin/orders`,
    'User': `/admin/users`,
    'KycSession': `/admin/kyc`,
    'ApiKey': `/admin/api-keys`,
    'Integration': `/admin/integrations`,
  };

  return urlMap[entity] || null;
}

