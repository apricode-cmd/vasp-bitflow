import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { 
  createDocumentSchema, 
  queryDocumentsSchema,
  type CreateDocumentInput 
} from '@/lib/validations/legal-document';
import { lexicalToHtml, lexicalToPlainText } from '@/lib/utils/lexical-to-html';

/**
 * GET /api/admin/documents
 * Get all legal documents with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    const { session } = authResult;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = {
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      isPublic: searchParams.get('isPublic') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
    };

    const validated = queryDocumentsSchema.parse(query);
    
    // Build where clause
    const where: any = {};
    
    if (validated.category) {
      where.category = validated.category;
    }
    
    if (validated.status) {
      where.status = validated.status;
    }
    
    if (validated.isPublic !== undefined) {
      where.isPublic = validated.isPublic;
    }
    
    if (validated.search) {
      where.OR = [
        { title: { contains: validated.search, mode: 'insensitive' } },
        { description: { contains: validated.search, mode: 'insensitive' } },
        { key: { contains: validated.search, mode: 'insensitive' } },
        { plainText: { contains: validated.search, mode: 'insensitive' } },
      ];
    }

    // Count total documents
    const total = await prisma.legalDocument.count({ where });

    // Get paginated documents
    const page = validated.page || 1;
    const limit = validated.limit || 50;
    const skip = (page - 1) * limit;

    const documents = await prisma.legalDocument.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { category: 'asc' },
        { updatedAt: 'desc' },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        slug: true,
        category: true,
        isRequired: true,
        status: true,
        isPublic: true,
        publishedAt: true,
        publishedBy: true,
        version: true,
        isLatest: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        // Don't include content in list view for performance
      },
    });

    return NextResponse.json({
      success: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/documents
 * Create a new legal document
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    const { session } = authResult;
    }

    const body = await request.json();
    const validated = createDocumentSchema.parse(body);

    // Check if key already exists
    const existing = await prisma.legalDocument.findUnique({
      where: { key: validated.key },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Document with this key already exists' },
        { status: 400 }
      );
    }

    // Check if slug already exists (if provided and public)
    if (validated.slug && validated.isPublic) {
      const slugExists = await prisma.legalDocument.findUnique({
        where: { slug: validated.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Document with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Convert Lexical content to HTML and plain text
    const htmlContent = validated.content ? lexicalToHtml(validated.content) : null;
    const plainText = validated.content ? lexicalToPlainText(validated.content) : null;

    // Create document
    const document = await prisma.legalDocument.create({
      data: {
        ...validated,
        htmlContent,
        plainText,
        createdBy: session.user.id,
        changeLog: [
          {
            action: 'created',
            timestamp: new Date().toISOString(),
            userId: session.user.id,
            userName: session.user.email,
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('Create document error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create document' },
      { status: 500 }
    );
  }
}

