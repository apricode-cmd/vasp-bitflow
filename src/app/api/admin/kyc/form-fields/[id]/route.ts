// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { z } from 'zod';

// Валидация для обновления поля
const updateFieldSchema = z.object({
  label: z.string().min(1).optional(),
  isRequired: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  validation: z.any().optional(), // JSON
  options: z.any().optional(), // JSON
  // Conditional Logic
  dependsOn: z.string().nullable().optional(),
  showWhen: z.any().nullable().optional(), // JSON: { operator, value }
  // UX Enhancements
  helpText: z.string().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  customClass: z.string().nullable().optional()
});

/**
 * GET /api/admin/kyc/form-fields/[id]
 * Получить одно поле по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const field = await prisma.kycFormField.findUnique({
      where: { id: params.id }
    });

    if (!field) {
      return NextResponse.json(
        { error: 'KYC field not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(field);
  } catch (error: any) {
    console.error('Admin get KYC field error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC field' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/kyc/form-fields/[id]
 * Обновить поле KYC формы (полное обновление)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const validated = updateFieldSchema.parse(body);

    const field = await prisma.kycFormField.update({
      where: { id: params.id },
      data: validated
    });

    return NextResponse.json(field);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin update KYC field error:', error);
    return NextResponse.json(
      { error: 'Failed to update KYC field' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/kyc/form-fields/[id]
 * Обновить поле KYC формы (частичное обновление)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const validated = updateFieldSchema.parse(body);

    const field = await prisma.kycFormField.update({
      where: { id: params.id },
      data: validated
    });

    return NextResponse.json(field);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin update KYC field error:', error);
    return NextResponse.json(
      { error: 'Failed to update KYC field' },
      { status: 500 }
    );
  }
}


