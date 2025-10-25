/**
 * PSP Connectors Resource API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const schema = z.object({
  code: z.string(),
  name: z.string(),
  capabilities: z.array(z.string()),
  settlementCurrency: z.string(),
  apiConfig: z.record(z.any()).optional(),
  isEnabled: z.boolean().optional().default(true),
  status: z.string().optional().default('unconfigured')
});

export async function GET(): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const data = await prisma.pspConnector.findMany({ orderBy: { code: 'asc' } });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const validated = schema.parse(await req.json());
    const item = await prisma.pspConnector.create({ data: validated });

    const adminId = await getCurrentUserId();
    if (adminId) await auditService.logAdminAction(adminId, AUDIT_ACTIONS.SETTINGS_UPDATED, 'PspConnector', item.code, {}, validated);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}

