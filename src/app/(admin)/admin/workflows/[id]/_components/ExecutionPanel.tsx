'use client';

/**
 * Execution Panel Component (n8n-style)
 * 
 * Side panel for testing workflows with live execution visualization
 */

import { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Play,
  RotateCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

interface ExecutionData {
  executionId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  startTime?: number;
  endTime?: number;
  totalDuration?: number;
  steps: ExecutionStep[];
  contextData: any;
  result?: any;
}

interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  trigger: string;
  nodes: Node[];
  onNodeExecutionUpdate: (nodeId: string, data: any) => void;
}

// Sample data templates
const SAMPLE_DATA_TEMPLATES: Record<string, any> = {
  ORDER_CREATED: {
    userId: 'user123',
    amount: 15000,
    currency: 'BTC',
    fiatAmount: 50000,
    fiatCurrency: 'EUR',
    country: 'POL',
    kycStatus: 'APPROVED',
  },
  PAYIN_RECEIVED: {
    orderId: 'order123',
    amount: 10000,
    currency: 'EUR',
    senderName: 'John Doe',
  },
  KYC_SUBMITTED: {
    userId: 'user123',
    country: 'POL',
    documentType: 'PASSPORT',
  },
};

export default function ExecutionPanel({
  isOpen,
  onClose,
  workflowId,
  trigger,
  nodes,
  onNodeExecutionUpdate,
}: ExecutionPanelProps) {
  const [contextData, setContextData] = useState<string>(
    JSON.stringify(SAMPLE_DATA_TEMPLATES[trigger] || {}, null, 2)
  );
  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Clear execution when panel opens
  useEffect(() => {
    if (isOpen) {
      setExecution(null);
      setSelectedStepIndex(null);
    }
  }, [isOpen]);

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleLoadTemplate = () => {
    const template = SAMPLE_DATA_TEMPLATES[trigger];
    if (template) {
      setContextData(JSON.stringify(template, null, 2));
      toast.success('Template loaded');
    }
  };

  const simulateNodeByNode = async (parsedData: any) => {
    const executionId = `exec-${Date.now()}`;
    const steps: ExecutionStep[] = [];

    // Initialize execution
    const initialExecution: ExecutionData = {
      executionId,
      status: 'running',
      startTime: Date.now(),
      contextData: parsedData,
      steps: [],
    };
    setExecution(initialExecution);

    // Process nodes in order (simplified - should follow edges)
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.type === 'trigger') return -1;
      if (b.type === 'trigger') return 1;
      return 0;
    });

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const step: ExecutionStep = {
        nodeId: node.id,
        nodeName: node.data?.label || node.type || 'Unknown',
        nodeType: node.type || 'unknown',
        status: 'running',
        startTime: Date.now(),
        input: i === 0 ? parsedData : steps[i - 1]?.output || parsedData,
      };

      steps.push(step);
      setExecution(prev => prev ? { ...prev, steps: [...steps] } : null);

      // Update node visual state
      onNodeExecutionUpdate(node.id, {
        executionStatus: 'running',
        executionResult: undefined,
        executionTime: undefined,
      });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

      // Simulate result
      const duration = Date.now() - step.startTime;
      const isError = Math.random() < 0.1; // 10% chance of error

      if (isError) {
        step.status = 'error';
        step.error = 'Simulated error for testing';
        step.endTime = Date.now();
        step.duration = duration;

        onNodeExecutionUpdate(node.id, {
          executionStatus: 'error',
          executionTime: duration,
        });

        // Stop execution on error
        setExecution(prev => prev ? {
          ...prev,
          status: 'error',
          endTime: Date.now(),
          totalDuration: Date.now() - initialExecution.startTime!,
          steps: [...steps],
        } : null);
        setIsExecuting(false);
        return;
      }

      // Success
      let output = step.input;
      let executionResult: any = undefined;

      if (node.type === 'condition') {
        const conditionResult = Math.random() > 0.5;
        output = { ...step.input, conditionMet: conditionResult };
        executionResult = conditionResult;
      } else if (node.type === 'action') {
        output = { 
          ...step.input, 
          actionExecuted: node.data?.actionType || 'unknown',
          timestamp: new Date().toISOString(),
        };
      }

      step.status = 'success';
      step.output = output;
      step.endTime = Date.now();
      step.duration = duration;

      onNodeExecutionUpdate(node.id, {
        executionStatus: 'success',
        executionResult,
        executionTime: duration,
      });

      setExecution(prev => prev ? { ...prev, steps: [...steps] } : null);

      // Small delay between nodes
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Complete execution
    setExecution(prev => prev ? {
      ...prev,
      status: 'success',
      endTime: Date.now(),
      totalDuration: Date.now() - initialExecution.startTime!,
    } : null);
    setIsExecuting(false);
  };

  const handleExecute = async () => {
    try {
      const parsedData = JSON.parse(contextData);
      setIsExecuting(true);
      setSelectedStepIndex(null);
      setExpandedSteps(new Set());

      // Clear previous execution status from all nodes
      nodes.forEach(node => {
        onNodeExecutionUpdate(node.id, {
          executionStatus: undefined,
          executionResult: undefined,
          executionTime: undefined,
        });
      });

      await simulateNodeByNode(parsedData);
      toast.success('Execution completed');
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        toast.error('Execution failed');
        console.error(error);
      }
      setIsExecuting(false);
    }
  };

  const getStepIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    if (!execution) return null;

    const variants = {
      idle: 'secondary',
      running: 'default',
      success: 'default',
      error: 'destructive',
    } as const;

    const labels = {
      idle: 'Ready',
      running: 'Running...',
      success: 'Success',
      error: 'Failed',
    };

    return (
      <Badge variant={variants[execution.status] || 'secondary'}>
        {labels[execution.status]}
      </Badge>
    );
  };

  if (!isOpen) return null;

  const selectedStep = selectedStepIndex !== null && execution?.steps[selectedStepIndex];

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] border-l bg-background flex flex-col shadow-xl z-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Test Execution</h3>
          {getStatusBadge()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Input Data Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Input Data</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadTemplate}
                  disabled={isExecuting}
                  className="h-7 text-xs"
                >
                  Load Template
                </Button>
              </div>
            </div>
            <Textarea
              value={contextData}
              onChange={(e) => setContextData(e.target.value)}
              placeholder="Enter JSON context data..."
              className="font-mono text-xs h-32"
              disabled={isExecuting}
            />
          </div>

          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full"
            size="sm"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Workflow
              </>
            )}
          </Button>

          {/* Execution Summary */}
          {execution && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Execution Summary</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{execution.status}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium font-mono">
                      {execution.totalDuration ? `${execution.totalDuration}ms` : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Steps</span>
                    <span className="font-medium">{execution.steps.length}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Success</span>
                    <span className="font-medium">
                      {execution.steps.filter(s => s.status === 'success').length}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Execution Steps */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Execution Steps</Label>
                <div className="space-y-1">
                  {execution.steps.map((step, index) => {
                    const isExpanded = expandedSteps.has(index);
                    const isSelected = selectedStepIndex === index;

                    return (
                      <div
                        key={index}
                        className={cn(
                          'border rounded-lg overflow-hidden transition-colors',
                          isSelected && 'ring-2 ring-primary'
                        )}
                      >
                        {/* Step Header */}
                        <button
                          onClick={() => {
                            setSelectedStepIndex(index);
                            if (!isExpanded) {
                              toggleStepExpanded(index);
                            }
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left"
                        >
                          {getStepIcon(step.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {step.nodeName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {step.nodeType}
                            </p>
                          </div>
                          {step.duration !== undefined && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {step.duration}ms
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepExpanded(index);
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        </button>

                        {/* Step Details */}
                        {isExpanded && (
                          <div className="border-t bg-muted/30 p-2 space-y-2">
                            {step.error && (
                              <div className="space-y-1">
                                <Label className="text-[10px] text-destructive">Error</Label>
                                <pre className="text-[10px] font-mono bg-destructive/10 text-destructive p-2 rounded overflow-x-auto">
                                  {step.error}
                                </pre>
                              </div>
                            )}

                            {step.input && (
                              <div className="space-y-1">
                                <Label className="text-[10px]">Input</Label>
                                <pre className="text-[10px] font-mono bg-background p-2 rounded overflow-x-auto max-h-32">
                                  {JSON.stringify(step.input, null, 2)}
                                </pre>
                              </div>
                            )}

                            {step.output && (
                              <div className="space-y-1">
                                <Label className="text-[10px]">Output</Label>
                                <pre className="text-[10px] font-mono bg-background p-2 rounded overflow-x-auto max-h-32">
                                  {JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

