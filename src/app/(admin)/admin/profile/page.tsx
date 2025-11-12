/**
 * Admin Profile Page - Server Component Wrapper
 * 
 * Fetches admin session server-side and passes to client component
 */

import { redirect } from 'next/navigation';
import { getAdminSessionData } from '@/lib/services/admin-session.service';
import { AdminProfileClient } from './page-client';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export default async function AdminProfilePage() {
  const sessionData = await getAdminSessionData();

  if (!sessionData) {
    redirect('/admin/auth/login');
  }

  return (
    <AdminProfileClient 
      adminId={sessionData.adminId}
      adminEmail={sessionData.email}
      adminRole={sessionData.role}
    />
  );
}
