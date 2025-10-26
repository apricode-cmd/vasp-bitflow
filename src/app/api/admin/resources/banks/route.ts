/**
 * Bank Details Resource API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const data = await prisma.bankDetails.findMany({
      include: {
        fiatCurrency: true
      },
      orderBy: { currency: 'asc' }
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

