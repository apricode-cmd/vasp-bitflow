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
  let sessionData = await getAdminSessionData();

  if (!sessionData) {
    // Try NextAuth (Password+TOTP)
    const nextAuthSession = await getAdminSession();
    if (!nextAuthSession?.user?.id) {
      // No session found in either system
      redirect('/admin/auth/login');
    }
    // NextAuth session exists, allow access
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
