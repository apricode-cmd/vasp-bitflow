/**
 * Geo Location Utilities
 * 
 * Automatic country detection using Vercel Geo (Edge) + fallback APIs
 */

import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

export interface GeoData {
  country: string;
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  ip?: string;
}

/**
 * Get user's geo location from middleware headers (Server Components)
 * Best for: Server Components, Server Actions
 */
export async function getGeoFromHeaders(): Promise<GeoData> {
  const headersList = headers();
  
  return {
    country: headersList.get('x-user-country') || 'PL',
    city: headersList.get('x-user-city') || undefined,
    region: headersList.get('x-user-region') || undefined,
    latitude: headersList.get('x-user-latitude') || undefined,
    longitude: headersList.get('x-user-longitude') || undefined,
    ip: headersList.get('x-forwarded-for')?.split(',')[0] || 
        headersList.get('x-real-ip') || 
        undefined
  };
}

/**
 * Get user's geo location from NextRequest (API Routes, Middleware)
 * Best for: API Routes, Route Handlers
 */
export function getGeoFromRequest(request: NextRequest): GeoData {
  const geo = request.geo;
  
  return {
    country: geo?.country || 'PL',
    city: geo?.city,
    region: geo?.region,
    latitude: geo?.latitude,
    longitude: geo?.longitude,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        request.ip || 
        undefined
  };
}

/**
 * Get user's country code only (fastest)
 * Best for: Quick country checks
 */
export async function getUserCountry(): Promise<string> {
  const headersList = headers();
  return headersList.get('x-user-country') || 'PL';
}

/**
 * Get user's IP address
 */
export async function getUserIP(): Promise<string | undefined> {
  const headersList = headers();
  return headersList.get('x-forwarded-for')?.split(',')[0] || 
         headersList.get('x-real-ip') || 
         undefined;
}

/**
 * Check if IP is local/private
 */
export function isLocalIP(ip: string): boolean {
  return ip === '127.0.0.1' || 
         ip === '::1' || 
         ip === 'localhost' ||
         ip.startsWith('192.168.') ||
         ip.startsWith('10.') ||
         ip.startsWith('172.16.') ||
         ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') ||
         ip.startsWith('172.19.') ||
         ip.startsWith('172.20.') ||
         ip.startsWith('172.21.') ||
         ip.startsWith('172.22.') ||
         ip.startsWith('172.23.') ||
         ip.startsWith('172.24.') ||
         ip.startsWith('172.25.') ||
         ip.startsWith('172.26.') ||
         ip.startsWith('172.27.') ||
         ip.startsWith('172.28.') ||
         ip.startsWith('172.29.') ||
         ip.startsWith('172.30.') ||
         ip.startsWith('172.31.');
}

/**
 * Format geo data for logging
 */
export function formatGeoForLog(geo: GeoData): string {
  const parts = [geo.country];
  if (geo.city) parts.push(geo.city);
  if (geo.region) parts.push(geo.region);
  return parts.join(', ');
}

/**
 * Get full location string
 * Example: "Warsaw, Mazovia, Poland (PL)"
 */
export function getLocationString(geo: GeoData, countryName?: string): string {
  const parts: string[] = [];
  
  if (geo.city) parts.push(geo.city);
  if (geo.region && geo.region !== geo.city) parts.push(geo.region);
  
  if (countryName) {
    parts.push(`${countryName} (${geo.country})`);
  } else {
    parts.push(geo.country);
  }
  
  return parts.join(', ');
}

