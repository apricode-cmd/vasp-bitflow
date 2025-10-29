/**
 * API: Download KYC Verification Report PDF
 * GET /api/admin/kyc/[id]/download-report
 * 
 * Admin only - download KYCAID verification report
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { downloadKycReport } from '@/lib/services/kyc.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Check authentication and admin role
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const sessionId = params.id;

    console.log(`📄 Admin ${session.user.email} downloading report for KYC session: ${sessionId}`);

    // Download report
    const reportBuffer = await downloadKycReport(sessionId);

    // Return PDF
    return new NextResponse(reportBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="kyc-report-${sessionId}.pdf"`,
        'Content-Length': reportBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error('❌ Download KYC report failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to download KYC report'
      },
      { status: 500 }
    );
  }
}

