/**
 * Admin Layout
 * 
 * CRM layout with sidebar navigation
 * Note: Skips auth check for /admin/auth/* pages
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/layouts/AdminLayoutClient';
import { isSessionRevoked } from '@/lib/session-revocation-check';
import { headers } from 'next/headers';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Get current pathname
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Skip auth check for /admin/auth/* pages
  if (pathname.startsWith('/admin/auth')) {
    return <>{children}</>;
  }
  
  const session = await auth();

  // Redirect if not admin
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Check if session has been revoked (server-side, secure)
  const sessionRevoked = await isSessionRevoked();
  if (sessionRevoked) {
    redirect('/login?error=SessionRevoked&message=Your+session+has+been+terminated');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
