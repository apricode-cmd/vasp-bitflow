/**
 * Public Settings API
 * 
 * GET /api/settings/public
 * Returns public settings (isPublic: true) for client-side use
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get only public settings
    const settings = await prisma.systemSettings.findMany({
      where: {
        isPublic: true
      },
      select: {
        key: true,
        value: true,
        type: true
      }
    });

    // Convert array to object with type conversion
    const settingsObject: Record<string, any> = {};
    
    settings.forEach(setting => {
      let value: any = setting.value;
      
      if (setting.type === 'BOOLEAN') {
        value = setting.value === 'true';
      } else if (setting.type === 'NUMBER') {
        value = parseFloat(setting.value);
      } else if (setting.type === 'JSON') {
        try {
          value = JSON.parse(setting.value);
        } catch {
          value = setting.value;
        }
      }
      
      settingsObject[setting.key] = value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsObject
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Get public settings error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve settings'
      },
      { status: 500 }
    );
  }
}

