/**
 * Public Legal Documents API
 * 
 * GET /api/legal-documents/public
 * Returns published PUBLIC documents for client footer menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get only published PUBLIC documents
    const documents = await prisma.legalDocument.findMany({
      where: {
        status: 'PUBLISHED',
        category: 'PUBLIC',
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        publishedAt: true,
      },
      orderBy: [
        { publishedAt: 'desc' },
        { title: 'asc' },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        documents,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Get public legal documents error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve legal documents',
      },
      { status: 500 }
    );
  }
}

