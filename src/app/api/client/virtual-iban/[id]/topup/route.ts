/**
 * Virtual IBAN TopUp Request API
 * 
 * POST - Create a new top-up request
 * GET  - Get user's top-up requests for this Virtual IBAN
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { topUpRequestService } from '@/lib/services/topup-request.service';
import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const CreateTopUpSchema = z.object({
  amount: z.number()
    .min(10, 'Minimum top-up amount is €10')
    .max(100000, 'Maximum top-up amount is €100,000'),
});

// ==========================================
// POST - Create Top-Up Request
// ==========================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: virtualIbanId } = await params;

    // 2. Validate request body
    const body = await req.json();
    const validation = CreateTopUpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { amount } = validation.data;

    // 3. Create top-up request
    const topUpRequest = await topUpRequestService.createRequest({
      userId,
      virtualIbanId,
      amount,
      currency: 'EUR', // For now, only EUR supported
      metadata: {
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
        createdVia: 'web',
      },
    });

    console.log('[API] TopUp request created:', {
      id: topUpRequest.id,
      reference: topUpRequest.reference,
      amount: topUpRequest.amount,
    });

    return NextResponse.json({
      success: true,
      data: topUpRequest,
    });
  } catch (error) {
    console.error('[API] TopUp request creation failed:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any)?.code;
    
    // Handle existing pending request
    if (errorCode === 'EXISTING_PENDING_REQUEST') {
      return NextResponse.json(
        { 
          error: 'You already have a pending top-up request',
          code: 'EXISTING_PENDING_REQUEST',
          existingRequest: (error as any).existingRequest,
          message: 'Please complete or cancel your existing request before creating a new one.'
        },
        { status: 409 } // Conflict
      );
    }
    
    // Handle specific errors
    if (message.includes('not found') || message.includes('not active')) {
      return NextResponse.json(
        { error: 'Virtual IBAN account not found or not active' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create top-up request', details: message },
      { status: 500 }
    );
  }
}

// ==========================================
// GET - List User's Top-Up Requests
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: virtualIbanId } = await params;

    // 2. Get query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 3. Get user's top-up requests
    const requests = await topUpRequestService.getUserRequests(userId, {
      virtualIbanId,
      status: status || undefined,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error('[API] Get top-up requests failed:', error);
    
    return NextResponse.json(
      { error: 'Failed to get top-up requests' },
      { status: 500 }
    );
  }
}

