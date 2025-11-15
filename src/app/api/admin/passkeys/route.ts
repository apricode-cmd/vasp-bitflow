// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Passkeys Management API
 * 
 * GET: List all registered passkeys for admin
 * DELETE: Remove a passkey
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const passkeys = await prisma.webAuthnCredential.findMany({
      where: {
        adminId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        transports: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      passkeys,
    });
  } catch (error) {
    console.error('❌ Get passkeys error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passkeys' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const passkeyId = searchParams.get('id');

    if (!passkeyId) {
      return NextResponse.json(
        { error: 'Passkey ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const passkey = await prisma.webAuthnCredential.findFirst({
      where: {
        id: passkeyId,
        adminId: session.user.id,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found' },
        { status: 404 }
      );
    }

    // Check if it's the last passkey
    const passkeyCount = await prisma.webAuthnCredential.count({
      where: {
        adminId: session.user.id,
        isActive: true,
      },
    });

    if (passkeyCount === 1) {
      return NextResponse.json(
        { error: 'Cannot remove last passkey. Add another passkey first.' },
        { status: 400 }
      );
    }

    // Deactivate passkey (don't delete for audit trail)
    await prisma.webAuthnCredential.update({
      where: { id: passkeyId },
      data: { isActive: false },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'PASSKEY_REMOVED',
        entity: 'WEBAUTHN_CREDENTIAL',
        entityId: passkeyId,
        oldValue: JSON.stringify({ deviceName: passkey.deviceName }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Passkey removed successfully',
    });
  } catch (error) {
    console.error('❌ Delete passkey error:', error);
    return NextResponse.json(
      { error: 'Failed to remove passkey' },
      { status: 500 }
    );
  }
}

