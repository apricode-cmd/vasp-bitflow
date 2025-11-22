// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/kyc/documents
 * 
 * Get list of documents uploaded for current user's KYC session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'KYC session not found' },
        { status: 404 }
      );
    }

    // 3. Get documents for this session (only latest attempt for each type)
    const documents = await prisma.kycDocument.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      select: {
        documentType: true,
        fileUrl: true
      }
    });

    // Get unique document types (latest only)
    const uniqueDocs = documents.reduce((acc, doc) => {
      if (!acc.find(d => d.documentType === doc.documentType)) {
        acc.push(doc);
      }
      return acc;
    }, [] as typeof documents);

    return NextResponse.json({
      documents: uniqueDocs
    });

  } catch (error: any) {
    console.error('❌ [KYC DOCUMENTS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

