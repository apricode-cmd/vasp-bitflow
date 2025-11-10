import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { updateDocumentSchema } from '@/lib/validations/legal-document';
import { lexicalToHtml, lexicalToPlainText } from '@/lib/utils/lexical-to-html';

/**
 * GET /api/admin/documents/[id]
 * Get a single legal document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const document = await prisma.legalDocument.findUnique({
      where: { id: params.id },
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
    console.error('Get document error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/documents/[id]
 * Update a legal document
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

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

    const body = await request.json();
    const validated = updateDocumentSchema.parse(body);

    // Check if slug is being changed and already exists
    if (validated.slug && validated.slug !== existing.slug) {
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

    // Convert Lexical content to HTML and plain text if content is being updated
    const updateData: any = { ...validated };
    if (validated.content) {
      updateData.htmlContent = lexicalToHtml(validated.content);
      updateData.plainText = lexicalToPlainText(validated.content);
    }

    // Build change log entry
    const changes: string[] = [];
    if (validated.title && validated.title !== existing.title) changes.push('title');
    if (validated.content) changes.push('content');
    if (validated.status && validated.status !== existing.status) changes.push('status');
    
    const changeLogEntry = {
      action: 'updated',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userName: session.user.email,
      fields: changes,
    };

    // Update document
    const document = await prisma.legalDocument.update({
      where: { id: params.id },
      data: {
        ...updateData,
        updatedBy: session.user.id,
        changeLog: [
          ...(existing.changeLog as any[] || []),
          changeLogEntry,
        ],
      },
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/documents/[id]
 * Delete a legal document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

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

    // Don't allow deleting published documents
    if (existing.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Cannot delete published documents. Archive them instead.' },
        { status: 400 }
      );
    }

    // Delete document
    await prisma.legalDocument.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}

