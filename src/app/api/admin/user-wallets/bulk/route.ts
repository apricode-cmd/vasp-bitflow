/**
 * User Wallets Bulk Actions API
 * POST /api/admin/user-wallets/bulk - Perform bulk operations on wallets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const bulkActionSchema = z.object({
  walletIds: z.array(z.string().cuid()).min(1),
  action: z.enum(['verify', 'unverify', 'setDefault', 'delete'])
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();
    const validated = bulkActionSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let result;

    switch (validated.action) {
      case 'verify':
        result = await prisma.userWallet.updateMany({
          where: { id: { in: validated.walletIds } },
          data: { isVerified: true }
        });
        break;

      case 'unverify':
        result = await prisma.userWallet.updateMany({
          where: { id: { in: validated.walletIds } },
          data: { isVerified: false }
        });
        break;

      case 'setDefault':
        // For setDefault, we need to handle each wallet individually
        // to ensure only one default per user/currency
        const wallets = await prisma.userWallet.findMany({
          where: { id: { in: validated.walletIds } },
          select: { id: true, userId: true, currencyCode: true }
        });

        // Group by user+currency
        const groups = new Map<string, string[]>();
        for (const wallet of wallets) {
          const key = `${wallet.userId}:${wallet.currencyCode}`;
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key)!.push(wallet.id);
        }

        // For each group, unset existing defaults and set new one
        const operations = [];
        for (const [key, ids] of groups.entries()) {
          const [userId, currencyCode] = key.split(':');
          
          // Unset existing defaults
          operations.push(
            prisma.userWallet.updateMany({
              where: { userId, currencyCode, isDefault: true },
              data: { isDefault: false }
            })
          );

          // Set first wallet in group as default
          operations.push(
            prisma.userWallet.update({
              where: { id: ids[0] },
              data: { isDefault: true }
            })
          );
        }

        await prisma.$transaction(operations);
        result = { count: wallets.length };
        break;

      case 'delete':
        // Check if any wallet is used in orders
        const walletsWithOrders = await prisma.userWallet.findMany({
          where: {
            id: { in: validated.walletIds },
            orders: { some: {} }
          },
          select: { id: true }
        });

        if (walletsWithOrders.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `${walletsWithOrders.length} wallet(s) cannot be deleted as they are used in orders`
            },
            { status: 400 }
          );
        }

        result = await prisma.userWallet.deleteMany({
          where: { id: { in: validated.walletIds } }
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      'bulk',
      {},
      {
        action: validated.action,
        walletIds: validated.walletIds,
        count: result.count
      },
      { entity: 'UserWallet', action: `bulk_${validated.action}` }
    );

    // Invalidate cache
    try {
      const keys = await redis.keys('user-wallets-*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️ [Redis] Invalidated ${keys.length} wallet cache keys`);
      }
    } catch (cacheError) {
      console.error('Redis cache invalidation error:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${validated.action}ed ${result.count} wallet(s)`,
      data: { count: result.count }
    });
  } catch (error) {
    console.error('Bulk wallet action error:', error);

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
      { success: false, error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}

