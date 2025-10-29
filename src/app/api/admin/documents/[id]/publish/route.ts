import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { publishDocumentSchema } from '@/lib/validations/legal-document';
import { lexicalToHtml, lexicalToPlainText } from '@/lib/utils/lexical-to-html';

/**
 * POST /api/admin/documents/[id]/publish
 * Publish a legal document (make it live)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if document exists
    const existing = await prisma.legalDocument.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already published
    if (existing.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Document is already published' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = publishDocumentSchema.parse(body);

    // Check if slug already exists
    if (validated.slug !== existing.slug) {
      const slugExists = await prisma.legalDocument.findFirst({
        where: {
          slug: validated.slug,
          id: { not: params.id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Document with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Convert content to HTML and plain text if not already done
    let htmlContent = existing.htmlContent;
    let plainText = existing.plainText;
    
    if (existing.content && !htmlContent) {
      htmlContent = lexicalToHtml(existing.content);
      plainText = lexicalToPlainText(existing.content);
    }

    // Publish document
    const document = await prisma.legalDocument.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
        slug: validated.slug,
        metaTitle: validated.metaTitle,
        metaDescription: validated.metaDescription,
        ogImage: validated.ogImage,
        isPublic: true,
        htmlContent,
        plainText,
        publishedAt: new Date(),
        publishedBy: session.user.id,
        updatedBy: session.user.id,
        changeLog: [
          ...(existing.changeLog as any[] || []),
          {
            action: 'published',
            timestamp: new Date().toISOString(),
            userId: session.user.id,
            userName: session.user.email,
            slug: validated.slug,
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      document,
      message: `Document published successfully at /legal/${validated.slug}`,
    });
  } catch (error: any) {
    console.error('Publish document error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish document' },
      { status: 500 }
    );
  }
}

