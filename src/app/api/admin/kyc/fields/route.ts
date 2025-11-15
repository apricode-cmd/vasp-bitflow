// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin KYC Fields Configuration API
 * 
 * GET /api/admin/kyc/fields - Get all KYC form fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { kycFormService } from '@/lib/services/kyc-form.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get all fields (including disabled)
    const fields = await kycFormService.getAllFields();

    // Group by category
    const grouped = await kycFormService.getFieldsByCategory();

    return NextResponse.json({
      success: true,
      data: {
        fields,
        grouped
      }
    });
  } catch (error) {
    console.error('Get KYC fields error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve KYC fields'
      },
      { status: 500 }
    );
  }
}






