/**
 * Admin Layout
 * 
 * CRM layout with sidebar navigation
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/layouts/AdminLayoutClient';
import { isSessionRevoked } from '@/lib/session-revocation-check';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
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
