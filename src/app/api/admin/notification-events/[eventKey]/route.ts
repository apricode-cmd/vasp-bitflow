/**
 * Notification Event Detail API
 * 
 * GET: Get single event
 * PATCH: Update event
 * DELETE: Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['ORDER', 'KYC', 'PAYMENT', 'SECURITY', 'SYSTEM', 'ADMIN', 'MARKETING']).optional(),
  channels: z.array(z.enum(['EMAIL', 'IN_APP', 'SMS', 'PUSH'])).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  isActive: z.boolean().optional(),
  templateId: z.string().nullable().optional(),
  templateKey: z.string().optional(), // Deprecated
  
  // Variable Schema (Phase 1.2)
  variableSchema: z.any().optional(),
  requiredVariables: z.array(z.string()).optional(),
  optionalVariables: z.array(z.string()).optional(),
  examplePayload: z.any().optional(),
  developerNotes: z.string().optional(),
  usageExamples: z.any().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { eventKey: string } }
) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    const event = await prisma.notificationEvent.findUnique({
      where: { eventKey: params.eventKey },
      include: {
        subscriptions: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get usage stats
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      prisma.notificationQueue.count({
        where: { eventKey: params.eventKey, status: 'SENT' }
      }),
      prisma.notificationQueue.count({
        where: { eventKey: params.eventKey, status: 'FAILED' }
      }),
      prisma.notificationQueue.count({
        where: { eventKey: params.eventKey, status: 'PENDING' }
      })
    ]);

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        stats: {
          sent: sentCount,
          failed: failedCount,
          pending: pendingCount,
          subscriptions: event.subscriptions.length
        }
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/notification-events/[eventKey] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventKey: string } }
) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    // Check if event exists
    const existing = await prisma.notificationEvent.findUnique({
      where: { eventKey: params.eventKey }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Prevent modification of system events (except isActive)
    if (existing.isSystem) {
      // Allow only isActive toggle for system events
      const allowedFields = ['isActive'];
      const requestedFields = Object.keys(validatedData);
      const hasDisallowedFields = requestedFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { success: false, error: 'Cannot modify system events (only isActive toggle is allowed)' },
          { status: 400 }
        );
      }
    }

    // Validate templateId if provided
    if (validatedData.templateId !== undefined && validatedData.templateId !== null) {
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

      // Warn if template is not published
      if (template.status !== 'PUBLISHED') {
        console.warn(`⚠️ Event "${params.eventKey}" linked to non-published template "${template.name}"`);
      }
    }

    // Update event
    const event = await prisma.notificationEvent.update({
      where: { eventKey: params.eventKey },
      data: validatedData
    });

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error: any) {
    console.error('❌ PATCH /api/admin/notification-events/[eventKey] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventKey: string } }
) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN'); // Only super admin can delete
    if (session instanceof NextResponse) return session;

    // Check if event exists
    const existing = await prisma.notificationEvent.findUnique({
      where: { eventKey: params.eventKey }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system events
    if (existing.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system events' },
        { status: 400 }
      );
    }

    // Delete event (will cascade to subscriptions and queue items)
    await prisma.notificationEvent.delete({
      where: { eventKey: params.eventKey }
    });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ DELETE /api/admin/notification-events/[eventKey] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}

