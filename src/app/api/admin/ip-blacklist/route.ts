// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * IP Blacklist API
 * 
 * GET /api/admin/ip-blacklist - List all blocked IPs
 * POST /api/admin/ip-blacklist - Block a new IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const blockIPSchema = z.object({
  ipAddress: z.string().ip(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const ipAddress = searchParams.get('ipAddress');

    // Build where clause
    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (ipAddress) {
      where.ipAddress = {
        contains: ipAddress,
        mode: 'insensitive'
      };
    }

    // Get blacklisted IPs
    const blacklist = await prisma.iPBlacklist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        blockedByUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: blacklist
    });
  } catch (error) {
    console.error('Get IP blacklist error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve IP blacklist'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = blockIPSchema.parse(body);

    // Check if IP is already blocked
    const existing = await prisma.iPBlacklist.findUnique({
      where: { ipAddress: validated.ipAddress }
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: 'This IP address is already blocked'
          },
          { status: 400 }
        );
      }

      // Reactivate existing block
      const updated = await prisma.iPBlacklist.update({
        where: { ipAddress: validated.ipAddress },
        data: {
          isActive: true,
          reason: validated.reason,
          blockedBy: adminId,
          expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
          notes: validated.notes,
          updatedAt: new Date()
        }
      });

      // Log action
      await auditService.logAdminAction(
        adminId,
        'IP_REBLOCKED',
        AUDIT_ENTITIES.SYSTEM_SETTINGS,
        updated.id,
        { isActive: false },
        { isActive: true, reason: validated.reason }
      );

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'IP address re-blocked successfully'
      });
    }

    // Create new block
    const blocked = await prisma.iPBlacklist.create({
      data: {
        ipAddress: validated.ipAddress,
        reason: validated.reason,
        blockedBy: adminId,
        isActive: true,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        notes: validated.notes
      }
    });

    // Log action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      blocked.id,
      {},
      {
        ipAddress: blocked.ipAddress,
        reason: blocked.reason,
        action: 'IP_BLOCKED'
      }
    );

    return NextResponse.json({
      success: true,
      data: blocked,
      message: 'IP address blocked successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Block IP error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to block IP address'
      },
      { status: 500 }
    );
  }
}

