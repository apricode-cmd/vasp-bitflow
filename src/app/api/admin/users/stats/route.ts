/**
 * Admin Users Stats API
 * 
 * GET /api/admin/users/stats - Get quick statistics for users page
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get all stats in parallel
    const [
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      pendingKyc,
      approvedKyc,
      inactiveUsers,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users
      prisma.user.count({
        where: { isActive: true }
      }),
      
      // New users this week
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Pending KYC
      prisma.kycSession.count({
        where: { status: 'PENDING' }
      }),
      
      // Approved KYC
      prisma.kycSession.count({
        where: { status: 'APPROVED' }
      }),
      
      // Inactive users
      prisma.user.count({
        where: { isActive: false }
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersThisWeek,
        pendingKyc,
        approvedKyc,
        inactiveUsers,
      }
    });
  } catch (error) {
    console.error('❌ [Admin Users Stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}

