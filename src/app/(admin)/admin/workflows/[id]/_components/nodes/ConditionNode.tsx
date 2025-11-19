'use client';

/**
 * Condition Node Component
 * 
 * Logic branching with True/False outputs
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Loader2, CheckCircle, XCircle } from 'lucide-react';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface ConditionNodeData {
  field: string;
  operator: string;
  value: any;
  label?: string;
  executionStatus?: ExecutionStatus;
  executionResult?: boolean; // true/false result
  executionTime?: number;
}

const OPERATOR_LABELS: Record<string, string> = {
  '==': 'equals',
  '!=': 'not equals',
  '>': 'greater than',
  '<': 'less than',
  '>=': 'greater or equal',
  '<=': 'less or equal',
  'in': 'is in',
  'not_in': 'not in',
  'contains': 'contains',
  'matches': 'matches',
};

function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const operatorLabel = OPERATOR_LABELS[data.operator] || data.operator;

  // Execution status styling
  const getExecutionStyles = () => {
    switch (data.executionStatus) {
      case 'running':
        return 'ring-2 ring-yellow-500 ring-offset-2 animate-pulse';
      case 'success':
        return 'ring-2 ring-green-500 ring-offset-2';
      case 'error':
        return 'ring-2 ring-red-500 ring-offset-2';
      default:
        return '';
    }
  };

  const ExecutionIcon = () => {
    switch (data.executionStatus) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={`
        min-w-[300px] transition-all
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md hover:shadow-lg'}
        bg-card border-2 border-accent
        ${getExecutionStyles()}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent text-primary">
            <GitBranch className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold">
                CONDITION
              </Badge>
              {data.executionStatus && data.executionStatus !== 'idle' && (
                <div className="flex items-center gap-1">
                  <ExecutionIcon />
                </div>
              )}
              {data.executionResult !== undefined && (
                <Badge variant={data.executionResult ? 'default' : 'destructive'} className="text-xs">
                  {data.executionResult ? 'TRUE' : 'FALSE'}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm text-foreground">
              {data.label || 'Logic Branch'}
            </h3>
            {data.executionTime !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.executionTime}ms
              </p>
            )}
          </div>
        </div>

        {/* Condition Logic */}
        <div className="space-y-2 bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs bg-background px-2 py-1 rounded border border-border">
              {data.field}
            </span>
            <span className="text-xs font-semibold text-primary">
              {operatorLabel}
            </span>
            <span className="font-mono text-xs bg-background px-2 py-1 rounded border border-border flex-1 truncate">
              {typeof data.value === 'object' 
                ? JSON.stringify(data.value) 
                : String(data.value)}
            </span>
          </div>
        </div>

        {/* Output Labels */}
        <div className="flex items-center justify-between mt-4 text-xs font-semibold">
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>TRUE</span>
          </div>
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>FALSE</span>
          </div>
        </div>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '40%' }}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '60%' }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
      />
    </Card>
  );
}

export default memo(ConditionNode);

