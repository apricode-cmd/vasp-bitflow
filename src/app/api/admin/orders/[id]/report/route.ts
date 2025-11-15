/**
 * Admin Order Report API
 * 
 * GET /api/admin/orders/[id]/report - Generate and download order PDF report
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOrderReportPDF, generateOrderReportFilename } from '@/lib/services/order-report-pdf.service';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // 1. Check admin authentication
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: orderId } = params;

    console.log(`[ORDER_REPORT_API] Generating report for order: ${orderId}`);

    // 2. Get order reference for filename
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        paymentReference: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 3. Generate PDF
    const pdfBuffer = await generateOrderReportPDF(orderId);

    // 4. Generate filename
    const filename = generateOrderReportFilename(orderId, order.paymentReference);

    console.log(`[ORDER_REPORT_API] Sending PDF: ${filename} (${pdfBuffer.length} bytes)`);

    // 5. Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[ORDER_REPORT_API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate order report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

