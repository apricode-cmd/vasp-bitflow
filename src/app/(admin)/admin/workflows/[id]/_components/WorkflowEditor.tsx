'use client';

/**
 * Workflow Editor Component
 * 
 * Complete workflow builder with canvas and toolbar
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';
import { ReactFlowProvider } from '@xyflow/react';

import WorkflowCanvas from './WorkflowCanvas';
import NodeToolbar from './NodeToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Pause, 
  Trash2,
  AlertCircle 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface WorkflowEditorProps {
  workflowId: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('ORDER_CREATED');
  const [priority, setPriority] = useState(0);
  
  // Graph state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const isNewWorkflow = workflowId === 'create';

  // Load workflow
  useEffect(() => {
    if (isNewWorkflow) {
      setLoading(false);
      return;
    }

    const loadWorkflow = async () => {
      try {
        const response = await fetch(`/api/admin/workflows/${workflowId}`);
        if (!response.ok) throw new Error('Failed to load workflow');
        
        const data = await response.json();
        setWorkflow(data.workflow);
        setName(data.workflow.name);
        setDescription(data.workflow.description || '');
        setTrigger(data.workflow.trigger);
        setPriority(data.workflow.priority);
        
        // Load visual state
        if (data.workflow.visualState) {
          setNodes(data.workflow.visualState.nodes || []);
          setEdges(data.workflow.visualState.edges || []);
        }
      } catch (error) {
        toast.error('Failed to load workflow');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId, isNewWorkflow]);

  // Save workflow
  const handleSave = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    if (!name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        trigger,
        priority,
        visualState: {
          nodes: currentNodes,
          edges: currentEdges,
        },
      };

      const url = isNewWorkflow 
        ? '/api/admin/workflows' 
        : `/api/admin/workflows/${workflowId}`;
      
      const method = isNewWorkflow ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save workflow');
      }

      const data = await response.json();
      toast.success('Workflow saved successfully');

      if (isNewWorkflow) {
        // Redirect to edit page after creation
        router.push(`/admin/workflows/${data.workflow.id}`);
      } else {
        setWorkflow(data.workflow);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }, [name, description, trigger, priority, workflowId, isNewWorkflow, router]);

  // Test workflow
  const handleTest = useCallback(async () => {
    if (isNewWorkflow) {
      toast.error('Please save the workflow first');
      return;
    }

    toast.info('Test workflow feature coming soon');
  }, [isNewWorkflow]);

  // Publish/Pause workflow
  const handleToggleActive = useCallback(async () => {
    if (isNewWorkflow) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      const response = await fetch(`/api/admin/workflows/${workflowId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: workflow.isActive ? 'PAUSED' : 'ACTIVE',
        }),
      });

      if (!response.ok) throw new Error('Failed to update workflow status');

      const data = await response.json();
      setWorkflow(data.workflow);
      toast.success(data.workflow.isActive ? 'Workflow activated' : 'Workflow paused');
    } catch (error) {
      toast.error('Failed to update workflow status');
      console.error(error);
    }
  }, [workflowId, workflow, isNewWorkflow]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/workflows')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-bold">
                {isNewWorkflow ? 'Create Workflow' : 'Edit Workflow'}
              </h1>
              {workflow && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                    {workflow.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{workflow.version} • {workflow.executionCount || 0} executions
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNewWorkflow && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button
                  variant={workflow?.isActive ? 'secondary' : 'default'}
                  size="sm"
                  onClick={handleToggleActive}
                >
                  {workflow?.isActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Workflow Config */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="col-span-2">
            <Label htmlFor="name">Workflow Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High-Value Order Review"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="trigger">Trigger Event *</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORDER_CREATED">Order Created</SelectItem>
                <SelectItem value="PAYIN_RECEIVED">PayIn Received</SelectItem>
                <SelectItem value="PAYOUT_REQUESTED">PayOut Requested</SelectItem>
                <SelectItem value="KYC_SUBMITTED">KYC Submitted</SelectItem>
                <SelectItem value="USER_REGISTERED">User Registered</SelectItem>
                <SelectItem value="WALLET_ADDED">Wallet Added</SelectItem>
                <SelectItem value="AMOUNT_THRESHOLD">Amount Threshold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="mt-3">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            className="mt-1.5 resize-none"
            rows={2}
          />
        </div>

        {!isNewWorkflow && !workflow?.isActive && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This workflow is paused. Click <strong>Activate</strong> to start execution.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Canvas + Toolbar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with NodeToolbar */}
        <div className="w-64 border-r overflow-y-auto">
          <NodeToolbar />
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlowProvider>
            <WorkflowCanvas
              workflowId={workflowId}
              initialNodes={nodes}
              initialEdges={edges}
              onSave={handleSave}
              onTest={handleTest}
              readOnly={false}
            />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}

