/**
 * Workflows List Page
 * 
 * Admin page for managing all workflows
 */

import { Suspense } from 'react';
import { requireAdminRole } from '@/lib/auth/admin-auth-utils';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Workflows | Admin',
  description: 'Manage compliance workflows',
};

export default async function WorkflowsPage() {
  // Check admin permission
  const authResult = await requireAdminRole(['SUPER_ADMIN', 'COMPLIANCE']);
  if (authResult instanceof Response) {
    redirect('/admin/auth/login');
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Visual compliance automation engine
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/workflows/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Link>
        </Button>
      </div>

      {/* Content */}
      <Suspense fallback={<div className="text-center py-12">Loading workflows...</div>}>
        <WorkflowsContent />
      </Suspense>
    </div>
  );
}

async function WorkflowsContent() {
  // TODO: Fetch workflows from API
  // For now, show placeholder
  return (
    <div className="text-center py-12 border-2 border-dashed rounded-lg">
      <p className="text-muted-foreground">
        No workflows yet. Create your first workflow to get started.
      </p>
    </div>
  );
}

