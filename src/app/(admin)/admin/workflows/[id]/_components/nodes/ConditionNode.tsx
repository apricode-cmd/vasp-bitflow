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
import { GitBranch } from 'lucide-react';

export interface ConditionNodeData {
  field: string;
  operator: string;
  value: any;
  label?: string;
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

  return (
    <Card
      className={`
        min-w-[300px] transition-all
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md hover:shadow-lg'}
        bg-white border-2 border-amber-200
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <GitBranch className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <Badge variant="outline" className="text-xs font-semibold mb-1">
              CONDITION
            </Badge>
            <h3 className="font-semibold text-sm text-gray-700">
              {data.label || 'Logic Branch'}
            </h3>
          </div>
        </div>

        {/* Condition Logic */}
        <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-300">
              {data.field}
            </span>
            <span className="text-xs font-semibold text-amber-600">
              {operatorLabel}
            </span>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-300 flex-1 truncate">
              {typeof data.value === 'object' 
                ? JSON.stringify(data.value) 
                : String(data.value)}
            </span>
          </div>
        </div>

        {/* Output Labels */}
        <div className="flex items-center justify-between mt-4 text-xs font-semibold">
          <div className="flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>TRUE</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
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
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '60%' }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(ConditionNode);

