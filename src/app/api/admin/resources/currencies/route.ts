/**
 * Currencies (Assets) Resource API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const createSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(18).optional().default(8),
  precision: z.number().int().min(0).max(18).optional().default(8),
  coingeckoId: z.string(),
  isToken: z.boolean().optional().default(false),
  chain: z.string().optional(),
  contractAddress: z.string().optional(),
  iconUrl: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0)
});

const updateSchema = createSchema.partial().omit({ code: true });

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    // Check if only active items should be returned (for selects/comboboxes)
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const currencies = await prisma.currency.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json({ success: true, data: currencies });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch currencies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const validated = createSchema.parse(await req.json());
    const currency = await prisma.currency.create({ data: validated });

    const adminId = await getCurrentUserId();
    if (adminId) {
      await auditService.logAdminAction(adminId, AUDIT_ACTIONS.CURRENCY_UPDATED, 'Currency', currency.code, {}, validated);
    }

    return NextResponse.json({ success: true, data: currency }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create currency' }, { status: 500 });
  }
}

