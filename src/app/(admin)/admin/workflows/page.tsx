/**
 * Workflows List Page
 * 
 * Admin page for managing all workflows
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Workflow as WorkflowIcon, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch('/api/admin/workflows');
        if (!response.ok) throw new Error('Failed to fetch workflows');
        
        const data = await response.json();
        setWorkflows(data.workflows || []);
      } catch (error) {
        toast.error('Failed to load workflows');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, workflow: any) => {
    e.preventDefault();
    e.stopPropagation();
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/workflows/${workflowToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete workflow');
      }

      toast.success('Workflow deleted successfully');
      
      // Remove from list
      setWorkflows(prev => prev.filter(w => w.id !== workflowToDelete.id));
      
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow');
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

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
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <WorkflowIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No workflows yet. Create your first workflow to get started.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/workflows/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Link href={`/admin/workflows/${workflow.id}`} className="flex-1">
                    <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                      {workflow.name}
                    </h3>
                  </Link>
                  <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                    {workflow.status}
                  </Badge>
                </div>
                
                {workflow.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Trigger: {workflow.trigger}</span>
                    <span>•</span>
                    <span>{workflow.executionCount || 0} executions</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      asChild
                    >
                      <Link href={`/admin/workflows/${workflow.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteClick(e, workflow)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{workflowToDelete?.name}</strong>?
              <br />
              <br />
              This action will archive the workflow and it will no longer execute.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

