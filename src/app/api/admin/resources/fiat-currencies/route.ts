// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Fiat Currencies Resource API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const createSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  symbol: z.string().min(1),
  precision: z.number().int().min(0).max(10).optional().default(2),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0)
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    // Check if only active items should be returned (for selects/comboboxes)
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const data = await prisma.fiatCurrency.findMany({ 
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { priority: 'asc' } 
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const validated = createSchema.parse(await req.json());
    const item = await prisma.fiatCurrency.create({ data: validated });

    const adminId = await getCurrentUserId();
    if (adminId) await auditService.logAdminAction(adminId, AUDIT_ACTIONS.SETTINGS_UPDATED, 'FiatCurrency', item.code, {}, validated);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}

