/**
 * Admin Trading Pairs API
 * 
 * GET /api/admin/trading-pairs - List all trading pairs
 * POST /api/admin/trading-pairs - Create new trading pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createTradingPairSchema } from '@/lib/validations/trading-pair';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get all trading pairs
    const pairs = await prisma.tradingPair.findMany({
      include: {
        crypto: true,
        fiat: true
      },
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    console.error('Get trading pairs error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve trading pairs'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = createTradingPairSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Check if pair already exists
    const existing = await prisma.tradingPair.findUnique({
      where: {
        cryptoCode_fiatCode: {
          cryptoCode: validated.cryptoCode,
          fiatCode: validated.fiatCode
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trading pair already exists'
        },
        { status: 400 }
      );
    }

    // Verify currencies exist
    const [crypto, fiat] = await Promise.all([
      prisma.currency.findUnique({ where: { code: validated.cryptoCode } }),
      prisma.fiatCurrency.findUnique({ where: { code: validated.fiatCode } })
    ]);

    if (!crypto || !fiat) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid currency codes'
        },
        { status: 400 }
      );
    }

    // Create trading pair
    const pair = await prisma.tradingPair.create({
      data: validated,
      include: {
        crypto: true,
        fiat: true
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.TRADING_PAIR_UPDATED,
      AUDIT_ENTITIES.TRADING_PAIR,
      pair.id,
      {},
      {
        cryptoCode: pair.cryptoCode,
        fiatCode: pair.fiatCode,
        feePercent: pair.feePercent,
        isActive: pair.isActive
      }
    );

    return NextResponse.json({
      success: true,
      data: pair
    }, { status: 201 });
  } catch (error) {
    console.error('Create trading pair error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create trading pair'
      },
      { status: 500 }
    );
  }
}

