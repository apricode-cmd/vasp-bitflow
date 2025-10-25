/**
 * Next.js Middleware
 * 
 * Protects routes and handles authentication checks.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes - allow without auth
  if (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/rates') ||  // Public API for rates
    path.startsWith('/api/payment-methods') ||  // Public API for payment methods
    path.startsWith('/api/v1/') ||  // Public API v1 (uses API keys)
    path.startsWith('/api/kyc/webhook')  // Webhook from KYCAID
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

