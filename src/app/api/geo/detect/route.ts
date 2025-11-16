/**
 * Geo Detection API
 * 
 * Returns user's detected location from Vercel Geo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeoFromRequest } from '@/lib/utils/geo';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/geo/detect
 * Detect user's location
 */
export async function GET(request: NextRequest) {
  try {
    const geo = getGeoFromRequest(request);
    
    // Check if we have valid geo data
    const hasGeoData = request.geo && request.geo.country;
    
    return NextResponse.json({
      success: true,
      country: geo.country || 'PL', // Always return a country
      city: geo.city || null,
      region: geo.region || null,
      latitude: geo.latitude || null,
      longitude: geo.longitude || null,
      detected: hasGeoData, // Flag to show if auto-detected or default
      // Don't expose IP to client for privacy
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Geo detection error:', error);
    
    return NextResponse.json({
      success: true, // Still return success with fallback
      country: 'PL', // Default fallback
      city: null,
      region: null,
      latitude: null,
      longitude: null,
      detected: false,
      error: 'Failed to detect location'
    }, {
      status: 200, // Don't fail the request
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  }
}

