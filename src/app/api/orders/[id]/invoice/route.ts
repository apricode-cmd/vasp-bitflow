/**
 * Client Invoice Download API
 * 
 * GET /api/orders/[id]/invoice - Download invoice PDF for user's order
 * 
 * Security:
 * - Requires authentication
 * - User can only download invoices for their own orders
 * - Order must not be CANCELLED
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
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
    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const orderId = params.id;
    console.log(`[CLIENT INVOICE] Request from user ${session.user.id} for order ${orderId}`);

    // 2. Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentReference: true
      }
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

    // Check if user owns this order
    if (order.userId !== session.user.id) {
      console.warn(`[CLIENT INVOICE] Unauthorized access attempt by ${session.user.id} to order ${orderId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to access this invoice'
        },
        { status: 403 }
      );
    }

    // 3. Validate invoice eligibility
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

    // 4. Generate PDF
    console.log(`[CLIENT INVOICE] Generating PDF for order ${orderId}...`);
    const pdfBuffer = await generateInvoicePDF(orderId);

    // 5. Return PDF as download
    // Use payment reference for filename (APR-XXX-YYY instead of CUID)
    const filename = generateInvoiceFilename(order.paymentReference);
    
    console.log(`[CLIENT INVOICE] PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);

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
    console.error('[CLIENT INVOICE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice'
      },
      { status: 500 }
    );
  }
}

