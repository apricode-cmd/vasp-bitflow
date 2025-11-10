/**
 * Notification Events Management API
 * 
 * GET: List all notification events
 * POST: Create new notification event
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createEventSchema = z.object({
  eventKey: z.string().min(1, 'Event key is required'),
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  category: z.enum(['ORDER', 'KYC', 'PAYMENT', 'SECURITY', 'SYSTEM', 'ADMIN', 'MARKETING']),
  channels: z.array(z.enum(['EMAIL', 'IN_APP', 'SMS', 'PUSH'])),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  isActive: z.boolean().default(true),
  templateId: z.string().optional(), // NEW: FK to EmailTemplate
  templateKey: z.string().optional(), // Deprecated: kept for backward compatibility
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === 'true';

    const events = await prisma.notificationEvent.findMany({
      where,
      orderBy: {
        category: 'asc'
      },
      include: {
        emailTemplate: {
          select: {
            id: true,
            key: true,
            name: true,
            category: true,
            status: true,
            isActive: true,
          }
        },
        _count: {
          select: {
            subscriptions: true,
            queue: true
          }
        }
      }
    });

    // Get usage stats for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const sentCount = await prisma.notificationQueue.count({
          where: {
            eventKey: event.eventKey,
            status: 'SENT'
          }
        });

        const failedCount = await prisma.notificationQueue.count({
          where: {
            eventKey: event.eventKey,
            status: 'FAILED'
          }
        });

        const lastSent = await prisma.notificationQueue.findFirst({
          where: {
            eventKey: event.eventKey,
            status: 'SENT'
          },
          orderBy: {
            sentAt: 'desc'
          },
          select: {
            sentAt: true
          }
        });

        return {
          ...event,
          stats: {
            subscriptions: event._count.subscriptions,
            queued: event._count.queue,
            sent: sentCount,
            failed: failedCount,
            lastSent: lastSent?.sentAt || null
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: eventsWithStats
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/notification-events error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN'); // Only super admin can create events
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    // Check if event key already exists
    const existing = await prisma.notificationEvent.findUnique({
      where: { eventKey: validatedData.eventKey }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Event with this key already exists' },
        { status: 400 }
      );
    }

    // Validate templateId if provided
    if (validatedData.templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: validatedData.templateId },
        select: { id: true, name: true, status: true, isActive: true }
      });

      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Email template not found' },
          { status: 400 }
        );
      }

      if (!template.isActive) {
        return NextResponse.json(
          { success: false, error: 'Selected email template is not active' },
          { status: 400 }
        );
      }

      // Warn if template is not published (but allow it)
      if (template.status !== 'PUBLISHED') {
        console.warn(`⚠️ Event "${validatedData.eventKey}" linked to non-published template "${template.name}"`);
      }
    }

    // Create event
    const event = await prisma.notificationEvent.create({
      data: validatedData
    });

    return NextResponse.json({
      success: true,
      message: 'Notification event created successfully',
      event
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/notification-events error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create notification event' },
      { status: 500 }
    );
  }
}

