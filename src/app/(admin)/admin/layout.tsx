/**
 * Admin Layout
 * 
 * CRM layout with sidebar navigation
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/layouts/AdminSidebar';

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

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}

