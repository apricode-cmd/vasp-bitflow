import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * GET /api/kyc/form-fields
 * Get enabled KYC form fields (for client)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get only enabled fields
    const fields = await prisma.kycFormField.findMany({
      where: {
        isEnabled: true
      },
      orderBy: [
        { category: 'asc' },
        { priority: 'asc' }
      ]
    });

    // Group by category
    const grouped = fields.reduce((acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, typeof fields>);

    return NextResponse.json({
      success: true,
      fields,
      grouped,
      total: fields.length
    });
  } catch (error: any) {
    console.error('Get KYC form fields error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KYC form fields' },
      { status: 500 }
    );
  }
}
