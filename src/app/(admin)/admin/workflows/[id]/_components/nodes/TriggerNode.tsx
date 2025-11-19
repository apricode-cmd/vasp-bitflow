'use client';

/**
 * Trigger Node Component
 * 
 * Entry point of workflow - represents the event that starts execution
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  DollarSign, 
  FileCheck, 
  UserPlus, 
  Wallet,
  TrendingUp 
} from 'lucide-react';

export interface TriggerNodeData {
  trigger: string;
  config?: Record<string, any>;
}

const TRIGGER_CONFIG = {
  ORDER_CREATED: {
    icon: DollarSign,
    label: 'Order Created',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
  },
  PAYIN_RECEIVED: {
    icon: TrendingUp,
    label: 'PayIn Received',
    color: 'bg-green-100 text-green-700 border-green-200',
    iconColor: 'text-green-600',
  },
  PAYOUT_REQUESTED: {
    icon: DollarSign,
    label: 'PayOut Requested',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    iconColor: 'text-orange-600',
  },
  KYC_SUBMITTED: {
    icon: FileCheck,
    label: 'KYC Submitted',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    iconColor: 'text-purple-600',
  },
  USER_REGISTERED: {
    icon: UserPlus,
    label: 'User Registered',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600',
  },
  WALLET_ADDED: {
    icon: Wallet,
    label: 'Wallet Added',
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    iconColor: 'text-teal-600',
  },
  AMOUNT_THRESHOLD: {
    icon: Zap,
    label: 'Amount Threshold',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    iconColor: 'text-yellow-600',
  },
};

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const config = TRIGGER_CONFIG[data.trigger as keyof typeof TRIGGER_CONFIG] || {
    icon: Zap,
    label: data.trigger,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    iconColor: 'text-gray-600',
  };

  const Icon = config.icon;

  return (
    <Card
      className={`
        min-w-[280px] transition-all
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md hover:shadow-lg'}
        ${config.color}
        border-2
      `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-white/80 ${config.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <Badge variant="outline" className="text-xs font-semibold mb-1">
              TRIGGER
            </Badge>
            <h3 className="font-semibold text-sm leading-tight">
              {config.label}
            </h3>
          </div>
        </div>

        {/* Config (if any) */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="text-xs space-y-1">
              {Object.entries(data.config).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="font-medium opacity-70">{key}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(TriggerNode);

