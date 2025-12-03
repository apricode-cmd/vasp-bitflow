/**
 * Admin API - Virtual IBAN List & Create
 * 
 * GET  /api/admin/virtual-iban - Get all Virtual IBAN accounts
 * POST /api/admin/virtual-iban - Create Virtual IBAN account for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { z } from 'zod';

// ==========================================
// GET - List all Virtual IBAN accounts
// ==========================================

export async function GET(req: NextRequest) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    // Get query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const providerId = searchParams.get('providerId') || undefined;
    const currency = searchParams.get('currency') || undefined;
    const userId = searchParams.get('userId') || undefined;

    // Get accounts (only pass defined filters)
    const filters: any = {};
    if (status) filters.status = status;
    if (providerId) filters.providerId = providerId;
    if (currency) filters.currency = currency;

    const accounts = await virtualIbanService.getAllAccounts(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    // Filter by userId if provided
    const filteredAccounts = userId
      ? accounts.filter((acc) => acc.userId === userId)
      : accounts;

    return NextResponse.json({
      success: true,
      data: filteredAccounts,
      count: filteredAccounts.length,
    });
  } catch (error) {
    console.error('[API] Get Virtual IBAN accounts failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST - Create Virtual IBAN for user
// ==========================================

const CreateAccountSchema = z.object({
  userId: z.string().cuid(),
});

export async function POST(req: NextRequest) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    // Parse and validate body
    const body = await req.json();
    const validation = CreateAccountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Create account
    const account = await virtualIbanService.createAccountForUser(userId);

    return NextResponse.json({
      success: true,
      data: account,
      message: 'Virtual IBAN account created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Create Virtual IBAN account failed:', error);
    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

