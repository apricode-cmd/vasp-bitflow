/**
 * Public Settings API Route
 * 
 * GET /api/admin/settings/public - Returns public branding settings (no auth required)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await prisma.adminSettings.findFirst({
      select: {
        companyName: true,
        tagline: true,
        primaryColor: true,
        logoUrl: true,
        faviconUrl: true
      }
    });

    if (!settings) {
      // Return defaults if no settings found
      return NextResponse.json({
        success: true,
        settings: {
          companyName: 'CryptoExchange CRM',
          tagline: 'Secure crypto trading platform',
          primaryColor: null,
          logoUrl: null,
          faviconUrl: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('[PUBLIC SETTINGS] Error:', error);
    
    // Return defaults on error
    return NextResponse.json({
      success: true,
      settings: {
        companyName: 'CryptoExchange CRM',
        tagline: 'Secure crypto trading platform',
        primaryColor: null,
        logoUrl: null,
        faviconUrl: null
      }
    });
  }
}


