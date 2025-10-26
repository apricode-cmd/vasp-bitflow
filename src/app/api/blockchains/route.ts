/**
 * Public Blockchains API Route
 * 
 * GET /api/blockchains - Returns active blockchain networks (public endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication (any authenticated user can access)
    const { error, session } = await requireAuth();
    if (error) return error;

    // Get active query param
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Fetch blockchain networks
    const blockchains = await prisma.blockchainNetwork.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        symbol: true,
        isActive: true,
        explorerUrl: true
      }
    });

    return NextResponse.json({
      success: true,
      data: blockchains
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load blockchain networks' },
      { status: 500 }
    );
  }
}

