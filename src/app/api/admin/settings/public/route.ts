/**
 * Public Settings API
 * 
 * GET: Get public/white-label settings (no auth required for some use cases)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get all public settings
    const settings = await prisma.systemSettings.findMany({
      where: {
        OR: [
          { isPublic: true },
          { key: { in: ['brandName', 'brandLogo', 'primaryColor', 'supportEmail', 'supportPhone'] } }
        ]
      }
    });

    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsMap
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/settings/public error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

