// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Email Template Presets API
 * 
 * GET: List available preset templates
 * POST: Import a preset template into database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/admin/email-templates/presets - List presets
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Read presets from JSON file
    const presetsPath = join(process.cwd(), 'src/lib/email-templates/presets.json');
    const presetsData = await readFile(presetsPath, 'utf-8');
    const presets = JSON.parse(presetsData);

    return NextResponse.json({
      success: true,
      presets: presets.map((preset: any) => ({
        key: preset.key,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        variables: preset.variables,
        layout: preset.layout,
      })),
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/email-templates/presets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

// POST /api/admin/email-templates/presets - Import preset
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { presetKey } = body;

    if (!presetKey) {
      return NextResponse.json(
        { success: false, error: 'Preset key is required' },
        { status: 400 }
      );
    }

    // Read presets from JSON file
    const presetsPath = join(process.cwd(), 'src/lib/email-templates/presets.json');
    const presetsData = await readFile(presetsPath, 'utf-8');
    const presets = JSON.parse(presetsData);

    // Find the preset
    const preset = presets.find((p: any) => p.key === presetKey);
    if (!preset) {
      return NextResponse.json(
        { success: false, error: 'Preset not found' },
        { status: 404 }
      );
    }

    // Check if template already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { key: preset.key },
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
        preheader: preset.preheader,
        htmlContent: preset.htmlContent,
        textContent: '', // Will be generated from HTML
        layout: preset.layout,
        variables: preset.variables,
        version: 1,
        isActive: true,
        isDefault: false, // Imported templates are not default
        status: 'DRAFT', // Start as draft for review
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/email-templates/presets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import preset' },
      { status: 500 }
    );
  }
}
