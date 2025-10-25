/**
 * KYC Form Fields API
 * 
 * GET /api/kyc/form-fields - Get enabled KYC form fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { kycFormService } from '@/lib/services/kyc-form.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const sessionOrError = await requireAuth();
    if (sessionOrError.error) {
      return sessionOrError.error;
    }

    // Get enabled fields grouped by category
    const grouped = await kycFormService.getFieldsByCategory();

    return NextResponse.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Get KYC form fields error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve form fields'
      },
      { status: 500 }
    );
  }
}

