/**
 * IP Blacklist [ID] API
 * 
 * GET /api/admin/ip-blacklist/[id] - Get specific IP block details
 * PATCH /api/admin/ip-blacklist/[id] - Update IP block (activate/deactivate)
 * DELETE /api/admin/ip-blacklist/[id] - Remove IP block
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get IP block details
    const block = await prisma.iPBlacklist.findUnique({
      where: { id },
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

    if (!block) {
      return NextResponse.json(
        {
          success: false,
          error: 'IP block not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: block
    });
  } catch (error) {
    console.error('Get IP block error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve IP block'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
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

    const { id } = await params;
    const body = await request.json();

    // Get existing block
    const existing = await prisma.iPBlacklist.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'IP block not found'
        },
        { status: 404 }
      );
    }

    // Update block
    const updated = await prisma.iPBlacklist.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    // Log action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      updated.id,
      { isActive: existing.isActive },
      { isActive: updated.isActive },
      { action: updated.isActive ? 'IP_BLOCK_ACTIVATED' : 'IP_BLOCK_DEACTIVATED' }
    );

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update IP block error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update IP block'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
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

    const { id } = await params;

    // Get existing block
    const existing = await prisma.iPBlacklist.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'IP block not found'
        },
        { status: 404 }
      );
    }

    // Delete block
    await prisma.iPBlacklist.delete({
      where: { id }
    });

    // Log action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      id,
      { ipAddress: existing.ipAddress, isActive: existing.isActive },
      {},
      { action: 'IP_BLOCK_REMOVED' }
    );

    return NextResponse.json({
      success: true,
      message: 'IP block removed successfully'
    });
  } catch (error) {
    console.error('Delete IP block error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete IP block'
      },
      { status: 500 }
    );
  }
}

