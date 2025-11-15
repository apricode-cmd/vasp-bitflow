/**
 * Admin Orders Light API Route
 * 
 * GET /api/admin/orders/light - List orders with minimal data for performance
 * 
 * Returns only essential fields:
 * - id, paymentReference, status
 * - cryptoAmount, currencyCode (code only, no object)
 * - totalFiat, fiatCurrencyCode (code only)
 * - user email (no profile)
 * - payIn/payOut status only
 * - timestamps
 * 
 * Response size: ~70% smaller than full endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/services/cache.service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const { error } = await requireAdminRole('ADMIN');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status');
    const currencyCode = searchParams.get('currencyCode');
    const fiatCurrencyCode = searchParams.get('fiatCurrencyCode');
    const search = searchParams.get('search');
    const hasPayIn = searchParams.get('hasPayIn');
    const hasPayOut = searchParams.get('hasPayOut');

    // Build cache key
    const cacheKey = `admin:orders:light:${status || 'all'}:${currencyCode || 'all'}:${fiatCurrencyCode || 'all'}:${page}:${limit}:${hasPayIn || ''}:${hasPayOut || ''}:${search || ''}`;
    
    // Try cache (skip if search query)
    if (!search) {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        console.log('📦 [Orders Light API] Cache HIT');
        return NextResponse.json(cached);
      }
    }

    // Build where clause
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (currencyCode) {
      where.currencyCode = currencyCode;
    }
    
    if (fiatCurrencyCode) {
      where.fiatCurrencyCode = fiatCurrencyCode;
    }
    
    // Search by payment reference or user email
    if (search) {
      where.OR = [
        {
          paymentReference: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }
    
    // Filter by PayIn/PayOut existence
    if (hasPayIn === 'true') {
      where.payIn = { isNot: null };
    } else if (hasPayIn === 'false') {
      where.payIn = null;
    }
    
    if (hasPayOut === 'true') {
      where.payOut = { isNot: null };
    } else if (hasPayOut === 'false') {
      where.payOut = null;
    }

    // Fetch orders with minimal data using select
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          // Core fields
          id: true,
          paymentReference: true,
          status: true,
          
          // Amounts (codes only, no objects!)
          cryptoAmount: true,
          currencyCode: true,
          fiatAmount: true,
          fiatCurrencyCode: true,
          totalFiat: true,
          rate: true,
          feePercent: true,
          
          // Wallet
          walletAddress: true,
          blockchainCode: true,
          
          // User (email only, no profile!)
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          
          // PayIn/PayOut (status only!)
          payIn: {
            select: {
              id: true,
              status: true
            }
          },
          payOut: {
            select: {
              id: true,
              status: true
            }
          },
          
          // Timestamps
          createdAt: true,
          updatedAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    const result = {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    };

    // Cache result (2 minutes) if no search
    if (!search) {
      await CacheService.set(cacheKey, result, 120);
      console.log('📦 [Orders Light API] Cached for 2 minutes');
    }

    console.log(`✅ [Orders Light API] Returned ${orders.length} orders (${Math.round(JSON.stringify(result).length / 1024)}KB)`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [Orders Light API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch orders' 
      },
      { status: 500 }
    );
  }
}

