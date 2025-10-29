import { z } from 'zod';

// Document categories and statuses
export const DocumentCategory = z.enum(['PUBLIC', 'INTERNAL', 'LEGAL']);
export const DocumentStatus = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

// Create legal document schema
export const createDocumentSchema = z.object({
  key: z.string()
    .min(3, 'Key must be at least 3 characters')
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Key must contain only lowercase letters, numbers, and underscores'),
  title: z.string().min(3).max(255),
  description: z.string().max(1000).optional().nullable(),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .nullable(),
  category: DocumentCategory,
  isRequired: z.boolean().default(false),
  content: z.any(), // Lexical editor state (JSON)
  htmlContent: z.string().optional().nullable(),
  plainText: z.string().optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  isPublic: z.boolean().default(false),
  allowedRoles: z.array(z.string()).default(['ADMIN']),
});

// Update legal document schema
export const updateDocumentSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .nullable(),
  category: DocumentCategory.optional(),
  isRequired: z.boolean().optional(),
  content: z.any().optional(), // Lexical editor state (JSON)
  htmlContent: z.string().optional().nullable(),
  plainText: z.string().optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional(),
  allowedRoles: z.array(z.string()).optional(),
  status: DocumentStatus.optional(),
});

// Publish document schema
export const publishDocumentSchema = z.object({
  slug: z.string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
});

// Query/filter schema
export const queryDocumentsSchema = z.object({
  category: DocumentCategory.optional(),
  status: DocumentStatus.optional(),
  isPublic: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type PublishDocumentInput = z.infer<typeof publishDocumentSchema>;
export type QueryDocumentsInput = z.infer<typeof queryDocumentsSchema>;

