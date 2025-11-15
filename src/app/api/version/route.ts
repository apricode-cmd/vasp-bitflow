/**
 * Version API
 * GET /api/version - Get current system version and build info
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    // Read version.json from project root
    const versionPath = join(process.cwd(), 'version.json');
    const versionContent = readFileSync(versionPath, 'utf-8');
    const versionData = JSON.parse(versionContent);

    return NextResponse.json({
      success: true,
      data: {
        version: versionData.version,
        buildNumber: versionData.buildNumber,
        buildDate: versionData.buildDate,
        releaseNotes: versionData.releaseNotes[versionData.version] || null
      }
    });
  } catch (error) {
    console.error('Version API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch version info',
        data: {
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          buildNumber: 1,
          buildDate: new Date().toISOString(),
          releaseNotes: null
        }
      },
      { status: 200 } // Still return 200 with fallback data
    );
  }
}

