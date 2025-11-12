/**
 * Admin Management Page (Server Component)
 * 
 * Entry point for administrator management
 */

import { redirect } from 'next/navigation';
import { getAdminSessionData } from '@/lib/services/admin-session.service';
import { AdminManagementClient } from './page-client';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Administrator Management - Apricode Exchange',
  description: 'Manage admin accounts, roles, and permissions',
};

export default async function AdminManagementPage() {
  const session = await getAdminSessionData();

  if (!session) {
    redirect('/admin/auth/login');
  }

  // Only SUPER_ADMIN can access this page
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard');
  }

  return (
    <AdminManagementClient 
      currentAdminId={session.adminId}
      currentAdminRole={session.role}
    />
  );
}
