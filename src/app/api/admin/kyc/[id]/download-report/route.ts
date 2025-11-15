// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * API: Sync KYC Documents from KYCAID
 * POST /api/admin/kyc/[id]/sync-documents
 * 
 * Admin only - fetch and save documents from KYCAID
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { syncKycDocuments } from '@/lib/services/kyc.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    console.log('📄 Sync documents request for session:', params.id);

    // Check authentication and admin role
    const session = await auth();
    
    if (!session?.user) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      console.log('❌ Forbidden - user role:', session.user.role);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const sessionId = params.id;

    console.log(`📄 Admin ${session.user.email} syncing documents for KYC session: ${sessionId}`);

    // Sync documents
    const result = await syncKycDocuments(sessionId);

    console.log(`✅ Documents synced successfully: ${result.documentsCount} documents`);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('❌ Sync KYC documents failed:', error);
    console.error('Error stack:', error.stack);
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to sync KYC documents',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

