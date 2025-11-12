/**
 * Admin Orders API Route
 * 
 * GET /api/admin/orders - List all orders with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

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

    // Filters
    const status = searchParams.get('status');
    const currencyCode = searchParams.get('currency');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (currencyCode) {
      where.currencyCode = currencyCode;
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

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

