/**
 * Email Template Presets API
 * 
 * GET: List all available preset templates
 * POST: Import a preset template into database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { emailTemplatePresets } from '@/lib/email-templates/presets';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    return NextResponse.json({
      success: true,
      presets: emailTemplatePresets.map(preset => ({
        key: preset.key,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        variables: preset.variables,
        layout: preset.layout
      }))
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/email-templates/presets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    const { presetKey } = await request.json();

    if (!presetKey) {
      return NextResponse.json(
        { success: false, error: 'Preset key is required' },
        { status: 400 }
      );
    }

    // Find preset
    const preset = emailTemplatePresets.find(p => p.key === presetKey);
    if (!preset) {
      return NextResponse.json(
        { success: false, error: 'Preset not found' },
        { status: 404 }
      );
    }

    // Check if template already exists
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        key: preset.key,
        orgId: null // Global template
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Template with this key already exists' },
        { status: 400 }
      );
    }

    // Create template from preset
    const template = await prisma.emailTemplate.create({
      data: {
        key: preset.key,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        subject: preset.subject,
        htmlContent: preset.htmlContent,
        textContent: '', // Optional
        preheader: preset.preheader,
        layout: preset.layout,
        variables: preset.variables,
        isDefault: true,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: session.user.id,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template imported successfully',
      template
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/email-templates/presets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import preset' },
      { status: 500 }
    );
  }
}

