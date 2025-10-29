/**
 * Upload Logo API
 * 
 * POST /api/admin/settings/upload-logo
 * Uploads logo to /public/uploads/ and saves path to SystemSettings
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

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

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `logo-${timestamp}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Public URL path
    const publicPath = `/uploads/${filename}`;

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
        value: publicPath,
        type: 'STRING',
        category: 'brand',
        description: 'Brand logo URL',
        isPublic: true,
        updatedBy: adminId || undefined
      },
      update: {
        value: publicPath,
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
        { value: publicPath },
        { filename, size: file.size, type: file.type }
      );
    }

    console.log('✅ Logo uploaded:', publicPath);

    return NextResponse.json({
      success: true,
      logoUrl: publicPath,
      filename
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

