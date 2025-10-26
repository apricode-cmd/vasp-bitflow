/**
 * Admin Layout
 * 
 * CRM layout with sidebar navigation
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/layouts/AdminLayoutClient';

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

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
