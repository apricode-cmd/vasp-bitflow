// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';

/**
 * GET /api/admin/kyc/form-fields
 * Получить все поля KYC формы, сгруппированные по категориям
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Получаем все поля
    const fields = await prisma.kycFormField.findMany({
      orderBy: [
        { category: 'asc' },
        { priority: 'asc' }
      ]
    });

    // Группируем по категориям
    const grouped = fields.reduce((acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, typeof fields>);

    return NextResponse.json({
      fields, // Весь список
      grouped, // Сгруппированный
      total: fields.length
    });
  } catch (error: any) {
    console.error('Admin get KYC form fields error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC form fields' },
      { status: 500 }
    );
  }
}


