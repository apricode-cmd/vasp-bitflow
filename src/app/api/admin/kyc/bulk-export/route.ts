// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin KYC Bulk Export API
 * 
 * POST /api/admin/kyc/bulk-export - Export selected KYC sessions to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { formatCSVField } from '@/lib/utils/export';

const BulkExportSchema = z.object({
  sessionIds: z.array(z.string()).min(1).max(1000),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const { error } = await requireAdminRole('ADMIN');
  if (error) return error;

  try {
    const body = await request.json();
    const validation = BulkExportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { sessionIds } = validation.data;

    // Fetch KYC sessions with related data
    const sessions = await prisma.kycSession.findMany({
      where: {
        id: { in: sessionIds },
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        profile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Build CSV content
    const headers = [
      'ID',
      'User Email',
      'First Name',
      'Last Name',
      'Country',
      'Status',
      'Submitted At',
      'Reviewed At',
      'Provider',
      'Verification ID',
      'PEP Status',
      'Risk Score',
      'Rejection Reason',
    ];

    const rows = sessions.map((session) => {
      const profile = session.profile || session.user.profile;
      
      return [
        session.id,
        session.user.email,
        profile?.firstName || '',
        profile?.lastName || '',
        profile?.nationality || session.user.profile?.country || '',
        session.status,
        session.submittedAt?.toISOString() || '',
        session.reviewedAt?.toISOString() || '',
        session.kycProviderId || '',
        session.verificationId || session.kycaidVerificationId || '',
        profile?.pepStatus ? 'Yes' : 'No',
        profile?.riskScore?.toString() || '',
        session.rejectionReason || '',
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.map(formatCSVField).join(','),
      ...rows.map((row) => row.map(formatCSVField).join(',')),
    ].join('\n');

    // Return as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kyc-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Bulk export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

