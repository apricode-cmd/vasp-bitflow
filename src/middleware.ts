/**
 * Next.js Middleware
 * 
 * Protects routes and handles:
 * - Maintenance Mode (blocks all non-admin users)
 * - Authentication checks
 * - Role-based access
 * 
 * NOTE: Cannot use Prisma in Edge Middleware!
 * Session revocation is checked in:
 * - Server Components (layout.tsx)
 * - API routes (via requireAuth)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

async function checkMaintenanceMode(): Promise<boolean> {
  try {
    // Fetch maintenance status from API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings/public`, {
      next: { revalidate: 60 } // Cache for 1 minute
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.settings?.maintenanceMode === true;
  } catch (error) {
    console.error('Failed to check maintenance mode:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Always allow maintenance page
  if (path === '/maintenance') {
    return NextResponse.next();
  }

  // Check maintenance mode (but allow admin access)
  const isMaintenanceMode = await checkMaintenanceMode();
  
  if (isMaintenanceMode) {
    const session = await auth();
    
    // Allow admins to access during maintenance
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // Public routes - allow without auth
  if (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/rates') ||  // Public API for rates
    path.startsWith('/api/payment-methods') ||  // Public API for payment methods
    path.startsWith('/api/settings/public') ||  // Public settings API
    path.startsWith('/api/v1/') ||  // Public API v1 (uses API keys)
    path.startsWith('/api/kyc/webhook') ||  // Webhook from KYCAID
    path.startsWith('/legal/')  // Legal pages
  ) {
    return NextResponse.next();
  }

  // For protected routes, check session using NextAuth v5
  const session = await auth();
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check admin routes
  if (path.startsWith('/admin') && session.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Session revocation is checked server-side in:
  // 1. Admin layout (src/app/(admin)/admin/layout.tsx)
  // 2. Client layout (src/app/(client)/layout.tsx)
  // 3. API routes (via requireAuth/requireRole)
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)'
  ]
};

