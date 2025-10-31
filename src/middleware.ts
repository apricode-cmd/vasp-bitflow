/**
 * Next.js Middleware
 * 
 * Protects routes and handles:
 * - Separate Client and Admin authentication
 * - Maintenance Mode (blocks all non-admin users)
 * - Role-based access
 * 
 * CLIENT routes: /, /login, /dashboard, /orders, etc. → use getClientSession
 * ADMIN routes: /admin/* → use getAdminSession
 * 
 * NOTE: Cannot use Prisma in Edge Middleware!
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getClientSession } from '@/auth-client';
import { getAdminSession } from '@/auth-admin';

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
  
  // Add pathname to headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', path);

  // Always allow these critical routes (to prevent infinite loops)
  if (
    path === '/maintenance' ||
    path.startsWith('/_next') ||
    path.startsWith('/api/settings/public') ||
    path.startsWith('/api/auth') ||  // Client auth
    path.startsWith('/api/admin/auth')  // Admin auth
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // === PUBLIC ADMIN AUTH ROUTES (MUST BE BEFORE ADMIN CHECK) ===
  if (
    path.startsWith('/admin/auth/login') || 
    path.startsWith('/admin/auth/emergency') ||
    path.startsWith('/admin/auth/setup-passkey')
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // === ADMIN ROUTES (PROTECTED) ===
  if (path.startsWith('/admin')) {
    // Protected admin routes - use ADMIN auth
    const adminSession = await getAdminSession();
    
    if (!adminSession?.user) {
      return NextResponse.redirect(new URL('/admin/auth/login', request.url));
    }

    // Check if admin is active (would need to check DB, but can't in middleware)
    // This check is done in layouts and API routes
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // === CLIENT ROUTES ===
  
  // Check maintenance mode FIRST (block ALL non-admin clients)
  const isMaintenanceMode = await checkMaintenanceMode();
  
  if (isMaintenanceMode) {
    // Check if user is admin (try admin session first)
    const adminSession = await getAdminSession();
    if (adminSession?.user) {
      // Admin can access during maintenance
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    // Block regular users
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Temporarily redirect landing page to login
  if (path === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Public routes - allow without auth
  if (
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/2fa-verify') ||
    path.startsWith('/api/rates') ||
    path.startsWith('/api/payment-methods') ||
    path.startsWith('/api/legal-documents/public') ||
    path.startsWith('/api/v1/') ||  // Public API v1 (uses API keys)
    path.startsWith('/api/kyc/webhook') ||  // Webhook from KYCAID
    path.startsWith('/legal/')
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For protected CLIENT routes, check CLIENT session
  const clientSession = await getClientSession();
  
  if (!clientSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Session revocation is checked server-side in:
  // 1. Admin layout (src/app/(admin)/admin/layout.tsx)
  // 2. Client layout (src/app/(client)/layout.tsx)
  // 3. API routes (via requireAuth/requireRole)
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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

