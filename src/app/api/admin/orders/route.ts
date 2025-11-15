/**
 * Admin Orders API Route
 * 
 * GET /api/admin/orders - List all orders with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/services/cache.service';

// Force dynamic rendering (uses request.url and cookies)
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

    // Enhanced filters
    const status = searchParams.get('status');
    const currencyCode = searchParams.get('currencyCode');
    const fiatCurrencyCode = searchParams.get('fiatCurrencyCode');
    const search = searchParams.get('search');
    const hasPayIn = searchParams.get('hasPayIn');
    const hasPayOut = searchParams.get('hasPayOut');
    const withoutPayIn = searchParams.get('withoutPayIn') === 'true';
    const withoutPayOut = searchParams.get('withoutPayOut') === 'true';

    // Build cache key from filters
    const cacheKey = `admin:orders:list:${status || 'all'}:${currencyCode || 'all'}:${fiatCurrencyCode || 'all'}:${page}:${limit}:${search || ''}`;
    
    // Try cache (only if no search)
    if (!search) {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Build where clause
    const where: any = {};
    
    if (status) {
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
    
    // Legacy filters for backward compatibility
    if (withoutPayIn) {
      where.payIn = null;
      where.status = {
        in: ['PENDING', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED']
      };
    }
    
    // Filter orders without PayOut (for manual PayOut creation)
    if (withoutPayOut) {
      where.payOut = null;
      // Only show orders that have payment received or are processing
      where.status = {
        in: ['PAYMENT_RECEIVED', 'PROCESSING']
      };
    }

    // Get orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            include: { profile: true }
          },
          currency: true,
          fiatCurrency: true,
          paymentMethod: true,
          blockchain: true,
          payIn: {
            include: {
              fiatCurrency: true,
              cryptocurrency: true,
              paymentMethod: true,
              network: true
            }
          },
          payOut: {
            include: {
              fiatCurrency: true,
              cryptocurrency: true,
              paymentMethod: true,
              network: true
            }
          }
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
      totalPages: Math.ceil(total / limit)
    };

    // Cache result (5 minutes) if no search
    if (!search) {
      await CacheService.set(cacheKey, result, 300);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

