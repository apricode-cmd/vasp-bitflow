/**
 * Upload Logo API
 * 
 * POST /api/admin/settings/upload-logo
 * Uploads logo to Vercel Blob Storage (production) or /public/uploads/ (development)
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: PNG, JPG, SVG, WebP' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Max size: 2MB' },
        { status: 400 }
      );
    }

    let logoUrl: string;
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `logo-${timestamp}.${extension}`;

    // DEVELOPMENT: Save to /public/uploads/
    if (isDevelopment) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const filepath = path.join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      logoUrl = `/uploads/${filename}`;
      console.log('✅ [DEV] Logo saved locally:', logoUrl);
    } 
    // PRODUCTION: Upload to Vercel Blob
    else {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
      }

      const blob = await put(filename, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      logoUrl = blob.url;
      console.log('✅ [PROD] Logo uploaded to Vercel Blob:', logoUrl);
    }

    // Get admin ID
    const adminId = await getCurrentUserId();

    // Get old logo for audit
    const oldSetting = await prisma.systemSettings.findUnique({
      where: { key: 'brandLogo' }
    });

    // Update brandLogo in SystemSettings
    await prisma.systemSettings.upsert({
      where: { key: 'brandLogo' },
      create: {
        key: 'brandLogo',
        value: logoUrl,
        type: 'STRING',
        category: 'brand',
        description: 'Brand logo URL',
        isPublic: true,
        updatedBy: adminId || undefined
      },
      update: {
        value: logoUrl,
        updatedBy: adminId || undefined
      }
    });

    // Audit log
    if (adminId) {
      await auditService.logAdminAction(
        adminId,
        AUDIT_ACTIONS.SETTINGS_UPDATED,
        AUDIT_ENTITIES.SYSTEM_SETTINGS,
        'brandLogo',
        { value: oldSetting?.value },
        { value: logoUrl },
        { filename, size: file.size, type: file.type, storage: isDevelopment ? 'local' : 'vercel-blob' }
      );
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      filename,
      storage: isDevelopment ? 'local' : 'vercel-blob'
    });
  } catch (error: any) {
    console.error('❌ Upload logo error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload logo'
      },
      { status: 500 }
    );
  }
}

