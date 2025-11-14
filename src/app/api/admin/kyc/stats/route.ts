/**
 * GET /api/admin/kyc/stats
 * 
 * KYC Statistics for dashboard
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const [
      totalSessions,
      pendingCount,
      approvedToday,
      rejectedToday,
      avgReviewTime,
    ] = await Promise.all([
      // Total sessions
      prisma.kycSession.count(),

      // Pending reviews
      prisma.kycSession.count({
        where: { status: 'PENDING' },
      }),

      // Approved today
      prisma.kycSession.count({
        where: {
          status: 'APPROVED',
          reviewedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Rejected today
      prisma.kycSession.count({
        where: {
          status: 'REJECTED',
          reviewedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Average review time (in hours)
      prisma.$queryRaw<Array<{ avg: number }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("reviewedAt" - "submittedAt")) / 3600) as avg
        FROM "KycSession"
        WHERE "reviewedAt" IS NOT NULL 
        AND "submittedAt" IS NOT NULL
        AND "reviewedAt" > "submittedAt"
      `,
    ]);

    const averageReviewHours = avgReviewTime[0]?.avg 
      ? Math.round(Number(avgReviewTime[0].avg) * 10) / 10 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalSessions,
        pendingReviews: pendingCount,
        approvedToday,
        rejectedToday,
        averageReviewTime: averageReviewHours,
      },
    });
  } catch (error) {
    console.error('Failed to fetch KYC stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

