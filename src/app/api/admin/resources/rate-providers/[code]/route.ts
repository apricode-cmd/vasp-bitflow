/**
 * Rate Provider Resource API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['market', 'average', 'aggregator']).optional(),
  weight: z.number().optional(),
  isActive: z.boolean().optional(),
  apiConfig: z.record(z.any()).optional(),
  priority: z.number().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;
    const body = await req.json();
    const validated = updateSchema.parse(body);
    const adminId = await getCurrentUserId();

    const old = await prisma.rateProvider.findUnique({ where: { code } });
    const updated = await prisma.rateProvider.update({ where: { code }, data: validated });

    if (adminId && old) {
      await auditService.logAdminAction(adminId, AUDIT_ACTIONS.SETTINGS_UPDATED, 'RateProvider', code, old, updated);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;
    await prisma.rateProvider.update({ where: { code }, data: { isActive: false } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}

