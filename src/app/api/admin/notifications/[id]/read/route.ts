/**
 * Mark Admin Notification as Read API
 * 
 * POST: Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const auditLogId = params.id;

    // Check if already read
    const existing = await prisma.adminNotificationRead.findUnique({
      where: {
        adminId_auditLogId: {
          adminId: session.user.id,
          auditLogId
        }
      }
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already marked as read'
      });
    }

    // Mark as read
    await prisma.adminNotificationRead.create({
      data: {
        adminId: session.user.id,
        auditLogId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/notifications/[id]/read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

