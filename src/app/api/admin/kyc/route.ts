/**
 * Admin KYC API Route
 * 
 * GET /api/admin/kyc - List all KYC sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const { error } = await requireRole('ADMIN');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    
    // Filters
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    // Get KYC sessions with explicit error handling
    const kycSessions = await prisma.kycSession.findMany({
      where,
      include: {
        user: {
          include: { 
            profile: true 
          }
        }
      },
      orderBy: status === 'PENDING' ? { submittedAt: 'desc' } : { createdAt: 'desc' }
    });

    return NextResponse.json({ kycSessions });
  } catch (error) {
    console.error('Admin get KYC sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC sessions' },
      { status: 500 }
    );
  }
}

