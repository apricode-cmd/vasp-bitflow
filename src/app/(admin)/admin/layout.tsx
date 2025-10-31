/**
 * Admin Layout
 * 
 * CRM layout with sidebar navigation
 * Note: Skips auth check for /admin/auth/* pages
 */

import { getAdminSessionData } from '@/lib/services/admin-session.service';
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
  const sessionData = await getAdminSessionData();

  // Redirect if not authenticated or not admin
  if (!sessionData) {
    redirect('/admin/auth/login');
  }


  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
