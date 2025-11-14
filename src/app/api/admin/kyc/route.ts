/**
 * Admin KYC API Route
 * 
 * GET /api/admin/kyc - List all KYC sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';

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

    // Generate cache key
    const cacheKey = `kyc-list:${status || 'all'}:${country || 'all'}:${provider || 'all'}:${pepStatus || 'all'}:${page}:${limit}:${sortBy}:${sortOrder}:${dateFrom || ''}:${dateTo || ''}`;
    
    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.error('Redis get error:', cacheError);
    }

    console.log(`📦 [Redis] Cache MISS: ${cacheKey}`);

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

    // Optimized query - get count and data in parallel
    const [total, kycSessions] = await Promise.all([
      prisma.kycSession.count({ where }),
      prisma.kycSession.findMany({
        where,
        select: {
          id: true,
          userId: true,
          status: true,
          kycProviderId: true,
          applicantId: true,
          verificationId: true,
          submittedAt: true,
          reviewedAt: true,
          rejectionReason: true,
          reviewedBy: true,
          reviewNotes: true,
          completedAt: true,
          expiresAt: true,
          webhookData: true,
          attempts: true,
          lastAttemptAt: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  country: true,
                  phoneNumber: true,
                }
              }
            }
          },
          profile: {
            select: {
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              nationality: true,
              documentType: true,
              documentNumber: true,
              pepStatus: true,
              sanctionsStatus: true,
              riskLevel: true,
            }
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              fileName: true,
              uploadedAt: true,
              status: true,
            },
            orderBy: { uploadedAt: 'desc' },
            take: 3 // Limit documents for list view
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      })
    ]);

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

    const response = { 
      success: true,
      data: sessionsWithProvider,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result for 3 minutes
    try {
      await redis.setex(cacheKey, 180, JSON.stringify(response));
      console.log(`📦 [Redis] Cached: ${cacheKey} (TTL: 180s)`);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin get KYC sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KYC sessions' },
      { status: 500 }
    );
  }
}

