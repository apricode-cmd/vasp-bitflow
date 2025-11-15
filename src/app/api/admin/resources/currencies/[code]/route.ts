// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Currency Resource API
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

const updateSchema = z.object({
  name: z.string().optional(),
  symbol: z.string().optional(),
  decimals: z.number().optional(),
  precision: z.number().optional(),
  coingeckoId: z.string().optional(),
  isToken: z.boolean().optional(),
  iconUrl: z.string().url().optional().nullable(),
  minOrderAmount: z.number().optional(),
  maxOrderAmount: z.number().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
  blockchains: z.array(blockchainSchema).optional()
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;

    const currency = await prisma.currency.findUnique({
      where: { code },
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

    if (!currency) {
      return NextResponse.json({ success: false, error: 'Currency not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: currency });
  } catch (error) {
    console.error('GET /api/admin/resources/currencies/[code] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch currency' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;
    const body = await req.json();
    const validated = updateSchema.parse(body);

    // Extract blockchains from validated data
    const { blockchains, ...currencyData } = validated;

    const old = await prisma.currency.findUnique({ 
      where: { code },
      include: { blockchainNetworks: true }
    });

    // Update currency
    const updateData: any = { ...currencyData };

    // If blockchains are provided, replace all blockchain relationships
    if (blockchains && blockchains.length > 0) {
      updateData.blockchainNetworks = {
        // Delete all existing relationships
        deleteMany: {},
        // Create new relationships
        create: blockchains.map(blockchain => ({
          blockchainCode: blockchain.blockchainCode,
          contractAddress: blockchain.contractAddress || null,
          isNative: blockchain.isNative,
          isActive: blockchain.isActive,
          priority: blockchain.priority
        }))
      };
    }

    const updated = await prisma.currency.update({ 
      where: { code }, 
      data: updateData,
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
    if (adminId && old) {
      await auditService.logAdminAction(adminId, AUDIT_ACTIONS.CURRENCY_UPDATED, 'Currency', code, old, updated);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /api/admin/resources/currencies/[code] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const { code } = await params;
    
    // Soft delete - just deactivate
    await prisma.currency.update({ 
      where: { code }, 
      data: { isActive: false } 
    });

    const adminId = await getCurrentUserId();
    if (adminId) {
      await auditService.logAdminAction(adminId, AUDIT_ACTIONS.CURRENCY_UPDATED, 'Currency', code, {}, { isActive: false });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/resources/currencies/[code] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to deactivate' }, { status: 500 });
  }
}

