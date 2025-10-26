/**
 * Fiat Currency Resource API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().optional(),
  symbol: z.string().optional(),
  precision: z.number().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;
    const validated = updateSchema.parse(await req.json());

    const old = await prisma.fiatCurrency.findUnique({ where: { code } });
    const updated = await prisma.fiatCurrency.update({ where: { code }, data: validated });

    const adminId = await getCurrentUserId();
    if (adminId && old) await auditService.logAdminAction(adminId, AUDIT_ACTIONS.SETTINGS_UPDATED, 'FiatCurrency', code, old, updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;
    await prisma.fiatCurrency.update({ where: { code }, data: { isActive: false } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to deactivate' }, { status: 500 });
  }
}

