/**
 * Admin Layout
 * 
 * CRM layout with sidebar navigation
 * Note: Skips auth check for /admin/auth/* pages
 * Supports BOTH Passkey (Custom JWT) and Password+TOTP (NextAuth) sessions
 */

import { getAdminSessionData } from '@/lib/services/admin-session.service';
import { getAdminSession } from '@/auth-admin';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/layouts/AdminLayoutClient';
import { headers } from 'next/headers';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Get current pathname from headers (set by middleware)
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  
  
  // Skip auth check for /admin/auth/* pages (login, setup-passkey, etc.)
  if (pathname.startsWith('/admin/auth')) {
    return <>{children}</>;
  }
  
  // For all other /admin/* pages, check authentication
  // Try Custom JWT (Passkey) first
  const sessionData = await getAdminSessionData();

  if (!sessionData) {
    // Try NextAuth (Password+TOTP)
    const nextAuthSession = await getAdminSession();
    console.log('🔍 [ADMIN LAYOUT] NextAuth session check:', {
      hasSession: !!nextAuthSession,
      userId: nextAuthSession?.user?.id,
      email: nextAuthSession?.user?.email,
      role: nextAuthSession?.user?.role
    });
    
    if (!nextAuthSession?.user?.id) {
      // No session found in either system
      console.log('❌ [ADMIN LAYOUT] No session found, redirecting to login');
      redirect('/admin/auth/login');
    }
    console.log('✅ [ADMIN LAYOUT] NextAuth session valid, allowing access');
    // NextAuth session exists, allow access
  } else {
    console.log('✅ [ADMIN LAYOUT] Custom JWT session valid:', {
      adminId: sessionData.adminId,
      email: sessionData.email,
      role: sessionData.role
    });
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
