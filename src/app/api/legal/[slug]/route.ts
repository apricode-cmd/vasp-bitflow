import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/legal/[slug]
 * Get a published legal document by slug (public access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const document = await prisma.legalDocument.findFirst({
      where: {
        slug: params.slug,
        status: 'PUBLISHED',
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        content: true,
        htmlContent: true,
        publishedAt: true,
        updatedAt: true,
        version: true,
        metaTitle: true,
        metaDescription: true,
        ogImage: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('Get legal document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

