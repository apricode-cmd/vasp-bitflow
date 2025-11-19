'use client';

/**
 * Test Workflow Dialog Component
 * 
 * Dialog for testing workflow with sample data
 */

import { useState } from 'react';
import type { Node } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  trigger: string;
  nodes: Node[];
  onExecutionStatusUpdate: (nodeId: string, executionData: any) => void;
  onExecutionStart: () => void;
  onExecutionEnd: () => void;
}

// Sample data templates for different triggers
const SAMPLE_DATA_TEMPLATES: Record<string, any> = {
  ORDER_CREATED: {
    userId: 'user123',
    amount: 15000,
    currency: 'BTC',
    fiatAmount: 50000,
    fiatCurrency: 'EUR',
    country: 'POL',
    kycStatus: 'APPROVED',
    orderCount: 5,
    totalVolume: 100000,
  },
  PAYIN_RECEIVED: {
    orderId: 'order123',
    amount: 10000,
    currency: 'EUR',
    senderName: 'John Doe',
    senderCountry: 'POL',
  },
  PAYOUT_REQUESTED: {
    orderId: 'order123',
    amount: 1.5,
    currency: 'BTC',
    destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    userId: 'user123',
  },
  KYC_SUBMITTED: {
    userId: 'user123',
    country: 'POL',
    documentType: 'PASSPORT',
    kycLevel: 'ENHANCED',
  },
  USER_REGISTERED: {
    userId: 'user123',
    email: 'test@example.com',
    country: 'POL',
  },
  WALLET_ADDED: {
    userId: 'user123',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    currency: 'BTC',
  },
  AMOUNT_THRESHOLD: {
    amount: 20000,
    currency: 'EUR',
    threshold: 10000,
  },
};

export default function TestWorkflowDialog({
  open,
  onOpenChange,
  workflowId,
  trigger,
  nodes,
  onExecutionStatusUpdate,
  onExecutionStart,
  onExecutionEnd,
}: TestWorkflowDialogProps) {
  const [contextData, setContextData] = useState<string>(
    JSON.stringify(SAMPLE_DATA_TEMPLATES[trigger] || {}, null, 2)
  );
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Simulate node-by-node execution with visual feedback
  const simulateExecution = async (nodes: Node[]) => {
    // Find trigger node
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return;

    // Step 1: Trigger running
    onExecutionStatusUpdate(triggerNode.id, { 
      executionStatus: 'running',
      executionResult: undefined,
      executionTime: undefined
    });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Trigger success
    onExecutionStatusUpdate(triggerNode.id, { 
      executionStatus: 'success',
      executionTime: Math.floor(Math.random() * 50) + 10
    });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Process other nodes (simplified simulation)
    const otherNodes = nodes.filter(n => n.type !== 'trigger');
    for (const node of otherNodes) {
      // Running
      onExecutionStatusUpdate(node.id, { 
        executionStatus: 'running',
        executionResult: undefined,
        executionTime: undefined
      });
      await new Promise(resolve => setTimeout(resolve, 400));

      // Success with result
      if (node.type === 'condition') {
        const result = Math.random() > 0.5;
        onExecutionStatusUpdate(node.id, { 
          executionStatus: 'success',
          executionResult: result,
          executionTime: Math.floor(Math.random() * 30) + 5
        });
      } else {
        onExecutionStatusUpdate(node.id, { 
          executionStatus: 'success',
          executionTime: Math.floor(Math.random() * 40) + 10
        });
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setResult(null);
      onExecutionStart();

      // Parse context data
      const parsedData = JSON.parse(contextData);

      // Start visual simulation
      const simulationPromise = simulateExecution(nodes);

      // Call test API
      const response = await fetch(`/api/admin/workflows/${workflowId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextData: parsedData,
        }),
      });

      // Wait for simulation to complete
      await simulationPromise;

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Test failed');
      }

      const data = await response.json();
      setResult(data);
      toast.success('Test completed successfully');
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        toast.error(error instanceof Error ? error.message : 'Test failed');
      }
      console.error(error);
      
      // Mark all nodes as error
      nodes.forEach(node => {
        onExecutionStatusUpdate(node.id, { 
          executionStatus: 'error',
          executionTime: 0
        });
      });
    } finally {
      setTesting(false);
      setTimeout(() => {
        onExecutionEnd();
      }, 2000); // Keep visualization for 2 seconds
    }
  };

  const handleLoadTemplate = () => {
    const template = SAMPLE_DATA_TEMPLATES[trigger];
    if (template) {
      setContextData(JSON.stringify(template, null, 2));
      toast.success('Template loaded');
    } else {
      toast.error('No template available for this trigger');
    }
  };

  const handleReset = () => {
    setContextData('{}');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Workflow</DialogTitle>
          <DialogDescription>
            Test your workflow with sample data to see what actions it would trigger.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="input" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Input Data</TabsTrigger>
            <TabsTrigger value="result" disabled={!result}>
              Result {result && (
                <Badge variant={result.success ? 'default' : 'destructive'} className="ml-2">
                  {result.success ? 'Success' : 'Failed'}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Context Data (JSON)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trigger: <Badge variant="outline" className="text-xs">{trigger}</Badge>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadTemplate}
                  disabled={testing}
                >
                  Load Template
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={testing}
                >
                  Reset
                </Button>
              </div>
            </div>

            <Textarea
              value={contextData}
              onChange={(e) => setContextData(e.target.value)}
              placeholder="Enter JSON context data..."
              className="flex-1 font-mono text-xs"
              disabled={testing}
            />
          </TabsContent>

          <TabsContent value="result" className="flex-1 flex flex-col space-y-4 overflow-auto">
            {result && (
              <div className="space-y-4">
                {/* Execution Summary */}
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {result.success ? 'Test Passed' : 'Test Failed'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Execution time: {result.executionTimeMs || 0}ms
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {result.success && result.result && (
                  <div>
                    <Label className="text-sm">Actions Triggered</Label>
                    <div className="mt-2 space-y-2">
                      {Array.isArray(result.result) && result.result.length > 0 ? (
                        result.result.map((action: any, index: number) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg bg-background"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge>{action.action || action.actionType}</Badge>
                            </div>
                            {action.config && Object.keys(action.config).length > 0 && (
                              <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(action.config, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                          No actions triggered
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {!result.success && result.error && (
                  <div>
                    <Label className="text-sm text-destructive">Error</Label>
                    <pre className="mt-2 text-xs font-mono bg-destructive/10 text-destructive p-3 rounded-lg overflow-x-auto">
                      {result.error}
                    </pre>
                  </div>
                )}

                {/* Raw Result */}
                <div>
                  <Label className="text-sm">Raw Result (JSON)</Label>
                  <pre className="mt-2 text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={testing}
          >
            Close
          </Button>
          <Button
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

