// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin Invoice Download API
 * 
 * GET /api/admin/orders/[id]/invoice - Download invoice PDF for any order (admin only)
 * 
 * Security:
 * - Requires ADMIN role
 * - Can download invoices for any order
 * - Logs admin action in audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { prisma } from '@/lib/prisma';
import {
  generateInvoicePDF,
  generateInvoiceFilename,
  validateInvoiceEligibility
} from '@/lib/services/invoice-pdf.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // 1. Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const orderId = params.id;
    console.log(`[ADMIN INVOICE] Request from admin ${adminId} for order ${orderId}`);

    // 2. Validate invoice eligibility
    try {
      await validateInvoiceEligibility(orderId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid order for invoice';
      return NextResponse.json(
        {
          success: false,
          error: errorMessage
        },
        { status: 400 }
      );
    }

    // 3. Get order for payment reference
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentReference: true }
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found'
        },
        { status: 404 }
      );
    }

    // 4. Generate PDF
    console.log(`[ADMIN INVOICE] Generating PDF for order ${orderId}...`);
    const pdfBuffer = await generateInvoicePDF(orderId);

    // 5. Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.ORDER_VIEWED,
      AUDIT_ENTITIES.ORDER,
      orderId,
      undefined,
      undefined,
      { action: 'invoice_downloaded' }
    );

    // 6. Return PDF as download
    // Use payment reference for filename (APR-XXX-YYY instead of CUID)
    const filename = generateInvoiceFilename(order.paymentReference);
    
    console.log(`[ADMIN INVOICE] PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${filename}`, // Remove quotes
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('[ADMIN INVOICE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice'
      },
      { status: 500 }
    );
  }
}

