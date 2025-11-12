/**
 * GET /api/admin/audit/mfa-events
 * 
 * Retrieve MFA events for Critical Actions tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  actorType: z.enum(['ADMIN', 'USER']).optional(),
  actorId: z.string().optional(),
  actionType: z.enum(['LOGIN', 'STEPUP', 'REGISTER']).optional(),
  method: z.enum(['WEBAUTHN', 'TOTP']).optional(),
  result: z.enum(['SUCCESS', 'FAIL']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await requireAdminAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    const { session } = authResult;
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validated = querySchema.parse(searchParams);

    // Build where clause
    const where: any = {};

    if (validated.actorType) {
      where.actorType = validated.actorType;
    }

    if (validated.actorId) {
      where.actorId = validated.actorId;
    }

    if (validated.actionType) {
      where.actionType = validated.actionType;
    }

    if (validated.method) {
      where.method = validated.method;
    }

    if (validated.result) {
      where.result = validated.result;
    }

    if (validated.fromDate || validated.toDate) {
      where.ts = {};
      if (validated.fromDate) {
        where.ts.gte = new Date(validated.fromDate);
      }
      if (validated.toDate) {
        where.ts.lte = new Date(validated.toDate);
      }
    }

    // Fetch MFA events
    const [events, total] = await Promise.all([
      prisma.mfaEvent.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: validated.limit,
        skip: validated.offset,
      }),
      prisma.mfaEvent.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        total,
        limit: validated.limit,
        offset: validated.offset,
      },
    });

  } catch (error) {
    console.error('❌ [MFA Events API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch MFA events' },
      { status: 500 }
    );
  }
}

