/**
 * TopUp Invoice PDF Generation API
 * 
 * GET - Generate and download PDF invoice for a TopUp request
 */

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { TopUpInvoiceDocument, TopUpInvoiceData } from '@/components/invoice/TopUpInvoiceDocument';

// ==========================================
// GET - Generate Invoice PDF
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: virtualIbanId, requestId } = await params;

    // 2. Get TopUp request
    const topUpRequest = await prisma.topUpRequest.findFirst({
      where: {
        id: requestId,
        userId: userId,
        virtualIbanId: virtualIbanId,
      },
      include: {
        virtualIban: true,
      },
    });

    if (!topUpRequest) {
      return NextResponse.json(
        { error: 'TopUp request not found' },
        { status: 404 }
      );
    }

    // 3. Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Get company legal settings
    const legalSettings = await prisma.systemSettings.findMany({
      where: { category: 'legal' },
    });

    const legalData: Record<string, string> = {};
    legalSettings.forEach((setting) => {
      legalData[setting.key] = setting.value;
    });

    // 5. Build invoice data
    const customerName = user.profile
      ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
      : user.email;

    const invoiceData: TopUpInvoiceData = {
      // Invoice info
      invoiceNumber: topUpRequest.invoiceNumber || `TU-${topUpRequest.reference}`,
      invoiceDate: topUpRequest.createdAt.toISOString(),
      
      // Company info
      companyLegalName: legalData.companyLegalName || 'Apricode Exchange Ltd.',
      companyRegistrationNumber: legalData.companyRegistrationNumber,
      companyTaxNumber: legalData.companyTaxNumber,
      companyAddress: legalData.companyAddress,
      companyEmail: legalData.companyEmail,
      companyWebsite: legalData.companyWebsite,
      
      // Customer info
      customerName: customerName || user.email,
      customerEmail: user.email,
      customerAddress: user.profile?.address || undefined,
      customerCountry: user.profile?.country || undefined,
      
      // Amount
      amount: topUpRequest.amount,
      currency: topUpRequest.currency,
      
      // Virtual IBAN details
      iban: topUpRequest.virtualIban.iban,
      bic: topUpRequest.virtualIban.bic || 'N/A',
      bankName: topUpRequest.virtualIban.bankName,
      accountHolder: topUpRequest.virtualIban.accountHolder,
      
      // Unique reference for matching
      reference: topUpRequest.reference,
    };

    // 6. Generate PDF
    console.log('[API] Generating TopUp Invoice PDF:', {
      requestId: topUpRequest.id,
      reference: topUpRequest.reference,
      amount: topUpRequest.amount,
    });

    const pdfBuffer = await renderToBuffer(
      React.createElement(TopUpInvoiceDocument, { data: invoiceData })
    );

    console.log(`[API] PDF generated: ${pdfBuffer.length} bytes`);

    // 7. Return PDF as download
    const filename = `topup-invoice-${topUpRequest.reference}.pdf`;
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[API] TopUp invoice generation failed:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

