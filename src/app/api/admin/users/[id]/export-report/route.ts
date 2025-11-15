// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]/export-report
 * 
 * Export user report as PDF (for banks/regulators)
 * Based on invoice PDF generation pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id: userId } = params;

    console.log(`[USER_REPORT_API] Generating report for user: ${userId}`);

    // Get user email for filename
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Dynamic import для PDF генерации (избегаем медленной компиляции)
    const { generateUserReportPDF, generateReportFilename } = await import('@/lib/services/user-report-pdf.service');
    
    // Generate PDF
    const pdfBuffer = await generateUserReportPDF(userId);

    // Generate filename
    const filename = generateReportFilename(userId, user.email);

    console.log(`[USER_REPORT_API] Report generated: ${filename} (${pdfBuffer.length} bytes)`);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[USER_REPORT_API] Failed to generate report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate user report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

