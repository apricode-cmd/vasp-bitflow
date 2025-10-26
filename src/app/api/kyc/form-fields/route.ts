/**
 * Client KYC Form Fields API
 * GET /api/kyc/form-fields - Get enabled KYC form fields for client
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('[KYC FORM FIELDS] Fetching enabled fields...');
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      console.log('[KYC FORM FIELDS] Unauthorized request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[KYC FORM FIELDS] User:', session.user.email);

    // Get enabled KYC form fields grouped by category
    const fields = await prisma.kycFormField.findMany({
      where: {
        isEnabled: true
      },
      orderBy: [
        { category: 'asc' },
        { priority: 'asc' }
      ]
    });

    console.log('[KYC FORM FIELDS] Found', fields.length, 'enabled fields');

    // Group by category
    const grouped = fields.reduce((acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, typeof fields>);

    console.log('[KYC FORM FIELDS] Grouped into categories:', Object.keys(grouped));

    return NextResponse.json({
      success: true,
      fields: grouped
    });
  } catch (error) {
    console.error('[KYC FORM FIELDS] Error details:', error);
    console.error('[KYC FORM FIELDS] Error name:', (error as Error)?.name);
    console.error('[KYC FORM FIELDS] Error message:', (error as Error)?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch form fields' },
      { status: 500 }
    );
  }
}
