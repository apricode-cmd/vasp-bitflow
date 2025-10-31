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
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const logoType = formData.get('type') as string || 'light'; // 'light' or 'dark'

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
    const filename = `logo-${logoType}-${timestamp}.${extension}`; // Include type in filename

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

    // Determine settings key based on logo type
    const settingsKey = logoType === 'dark' ? 'brandLogoDark' : 'brandLogo';

    // Get old logo for audit
    const oldSetting = await prisma.systemSettings.findUnique({
      where: { key: settingsKey }
    });

    // Update brandLogo or brandLogoDark in SystemSettings
    await prisma.systemSettings.upsert({
      where: { key: settingsKey },
      create: {
        key: settingsKey,
        value: logoUrl,
        type: 'STRING',
        category: 'brand',
        description: logoType === 'dark' ? 'Brand logo for dark mode' : 'Brand logo for light mode',
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
        settingsKey,
        { value: oldSetting?.value },
        { value: logoUrl },
        { filename, size: file.size, type: file.type, logoType, storage: isDevelopment ? 'local' : 'vercel-blob' }
      );
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      filename,
      logoType,
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

