/**
 * KYCAID Webhook API Route
 * 
 * POST /api/kyc/webhook - Handles KYCAID verification status updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { kycaidService } from '@/lib/services/kycaid';
import { kycWebhookSchema } from '@/lib/validations/kyc';
import { z } from 'zod';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get signature from headers
    const signature = request.headers.get('x-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();

    // Verify webhook signature
    const isValid = kycaidService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse and validate webhook payload
    const payload = JSON.parse(body);
    const validatedPayload = kycWebhookSchema.parse(payload);

    // Map KYCAID status to our internal status
    let status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
    
    if (validatedPayload.verification_status === 'completed') {
      status = 'APPROVED';
    } else if (
      validatedPayload.verification_status === 'rejected' ||
      validatedPayload.verification_status === 'declined'
    ) {
      status = 'REJECTED';
    }

    // Update KYC session in database
    const kycSession = await prisma.kycSession.findFirst({
      where: {
        kycaidVerificationId: validatedPayload.verification_id
      }
    });

    if (!kycSession) {
      console.error('KYC session not found:', validatedPayload.verification_id);
      return NextResponse.json(
        { error: 'KYC session not found' },
        { status: 404 }
      );
    }

    await prisma.kycSession.update({
      where: { id: kycSession.id },
      data: {
        status,
        reviewedAt: new Date(),
        rejectionReason: validatedPayload.rejection_reasons?.[0]?.reason
      }
    });

    // TODO: Send email notification to user about KYC status change

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('KYC webhook error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

