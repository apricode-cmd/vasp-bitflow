/**
 * Admin KYC API Route
 * 
 * GET /api/admin/kyc - List all KYC sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const { error } = await requireAdminRole('ADMIN');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    
    // Filters
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    const provider = searchParams.get('provider');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const pepStatus = searchParams.get('pepStatus');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by country (from user profile)
    if (country) {
      where.user = {
        profile: {
          country,
        },
      };
    }

    // Filter by KYC provider
    if (provider && provider !== 'all') {
      where.kycProviderId = provider;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.submittedAt = {};
      if (dateFrom) {
        where.submittedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.submittedAt.lte = new Date(dateTo);
      }
    }

    // Filter by PEP status
    if (pepStatus === 'yes' || pepStatus === 'no') {
      where.profile = {
        pepStatus: pepStatus === 'yes',
      };
    }

    // Get total count for pagination
    const total = await prisma.kycSession.count({ where });

    // Get KYC sessions with explicit error handling
    const kycSessions = await prisma.kycSession.findMany({
      where,
      include: {
        user: {
          include: { 
            profile: true 
          }
        },
        formData: {
          orderBy: { fieldName: 'asc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        profile: true
        // Note: provider relation removed - we use metadata.provider instead
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Transform data to include provider metadata from Integration
    const sessionsWithProvider = await Promise.all(
      kycSessions.map(async (session) => {
        let providerInfo = null;

        // If session has metadata.provider, get integration info
        const providerId = (session.metadata as any)?.provider;
        if (providerId) {
          const integration = await prisma.integration.findUnique({
            where: { service: providerId }
          });

        if (integration) {
          providerInfo = {
            name: integration.service.toUpperCase(), // Use service as name
            service: integration.service,
            status: integration.status,
            isEnabled: integration.isEnabled
          };
        }
        }

        return {
          ...session,
          provider: providerInfo
        };
      })
    );

    return NextResponse.json({ 
      success: true,
      data: sessionsWithProvider,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get KYC sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KYC sessions' },
      { status: 500 }
    );
  }
}

