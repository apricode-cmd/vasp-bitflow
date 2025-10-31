/**
 * Currencies (Assets) Resource API
 * Supports many-to-many relationships with blockchain networks
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const blockchainSchema = z.object({
  blockchainCode: z.string(),
  contractAddress: z.string().optional().nullable(),
  isNative: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0)
});

const createSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(18).optional().default(8),
  precision: z.number().int().min(0).max(18).optional().default(8),
  coingeckoId: z.string(),
  isToken: z.boolean().optional().default(false),
  iconUrl: z.string().url().optional().nullable(),
  minOrderAmount: z.number().optional().default(0.001),
  maxOrderAmount: z.number().optional().default(100),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0),
  blockchains: z.array(blockchainSchema).min(1, 'At least one blockchain is required')
});

const updateSchema = createSchema.partial().omit({ code: true });

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    // Check if only active items should be returned (for selects/comboboxes)
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const includeBlockchains = searchParams.get('includeBlockchains') === 'true';

    const currencies = await prisma.currency.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { priority: 'asc' },
      include: includeBlockchains ? {
        blockchainNetworks: {
          where: { isActive: true }, // Only include active blockchain relationships
          include: {
            blockchain: {
              select: {
                code: true,
                name: true,
                symbol: true,
                isActive: true // Include blockchain active status
              }
            }
          }
        }
      } : undefined
    });

    return NextResponse.json({ success: true, data: currencies });
  } catch (error) {
    console.error('GET /api/admin/resources/currencies error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch currencies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await req.json();
    const validated = createSchema.parse(body);

    // Extract blockchains from validated data
    const { blockchains, ...currencyData } = validated;

    // Create currency with blockchain relationships
    const currency = await prisma.currency.create({
      data: {
        ...currencyData,
        blockchainNetworks: {
          create: blockchains.map(blockchain => ({
            blockchainCode: blockchain.blockchainCode,
            contractAddress: blockchain.contractAddress || null,
            isNative: blockchain.isNative,
            isActive: blockchain.isActive,
            priority: blockchain.priority
          }))
        }
      },
      include: {
        blockchainNetworks: {
          include: {
            blockchain: {
              select: {
                code: true,
                name: true,
                symbol: true
              }
            }
          }
        }
      }
    });

    const adminId = await getCurrentUserId();
    if (adminId) {
      await auditService.logAdminAction(adminId, AUDIT_ACTIONS.CURRENCY_UPDATED, 'Currency', currency.code, {}, validated);
    }

    return NextResponse.json({ success: true, data: currency }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/resources/currencies error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create currency' }, { status: 500 });
  }
}

