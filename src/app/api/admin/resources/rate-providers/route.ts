/**
 * Rate Providers Resource API
 * 
 * GET /api/admin/resources/rate-providers - List all
 * POST /api/admin/resources/rate-providers - Create new
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const createSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  type: z.enum(['market', 'average', 'aggregator']),
  weight: z.number().min(0).max(10).optional().default(1.0),
  isActive: z.boolean().optional().default(true),
  apiConfig: z.record(z.any()).optional(),
  priority: z.number().int().min(0).optional().default(0)
});

export async function GET(): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const data = await prisma.rateProvider.findMany({
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch rate providers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const validated = createSchema.parse(body);
    const adminId = await getCurrentUserId();

    const provider = await prisma.rateProvider.create({ data: validated });

    if (adminId) {
      await auditService.logAdminAction(adminId, AUDIT_ACTIONS.SETTINGS_UPDATED, 'RateProvider', provider.code, {}, validated);
    }

    return NextResponse.json({ success: true, data: provider }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create rate provider' }, { status: 500 });
  }
}

