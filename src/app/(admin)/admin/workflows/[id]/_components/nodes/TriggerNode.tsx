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
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface TriggerNodeData {
  trigger: string;
  config?: {
    triggerConfig?: {
      filters: any[];
      logic: 'AND' | 'OR';
      enabled: boolean;
    };
    [key: string]: any;
  };
  executionStatus?: ExecutionStatus;
  executionResult?: any;
  executionTime?: number;
}

const TRIGGER_CONFIG = {
  ORDER_CREATED: {
    icon: DollarSign,
    label: 'Order Created',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  PAYIN_RECEIVED: {
    icon: TrendingUp,
    label: 'PayIn Received',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  PAYOUT_REQUESTED: {
    icon: DollarSign,
    label: 'PayOut Requested',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  KYC_SUBMITTED: {
    icon: FileCheck,
    label: 'KYC Submitted',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  USER_REGISTERED: {
    icon: UserPlus,
    label: 'User Registered',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  WALLET_ADDED: {
    icon: Wallet,
    label: 'Wallet Added',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  AMOUNT_THRESHOLD: {
    icon: Zap,
    label: 'Amount Threshold',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
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

  // Execution status styling
  const getExecutionStyles = () => {
    switch (data.executionStatus) {
      case 'running':
        return 'ring-2 ring-yellow-500 ring-offset-2';
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
        min-w-[280px] transition-all
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md hover:shadow-lg'}
        ${config.color}
        ${getExecutionStyles()}
        border-2
      `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-background/80 ${config.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold">
                TRIGGER
              </Badge>
              {data.executionStatus && data.executionStatus !== 'idle' && (
                <div className="flex items-center gap-1">
                  <ExecutionIcon />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight">
              {config.label}
            </h3>
            {data.executionTime !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.executionTime}ms
              </p>
            )}
          </div>
        </div>

        {/* Trigger Filters */}
        {data.config?.triggerConfig && data.config.triggerConfig.filters.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold opacity-70">FILTERS:</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {data.config.triggerConfig.filters.length} {data.config.triggerConfig.logic}
              </Badge>
            </div>
            <div className="text-[10px] space-y-0.5 opacity-70">
              {data.config.triggerConfig.filters.slice(0, 2).map((filter: any, idx: number) => (
                <div key={idx} className="truncate">
                  • {filter.field} {filter.operator} {String(filter.value).slice(0, 15)}
                </div>
              ))}
              {data.config.triggerConfig.filters.length > 2 && (
                <div className="text-[9px]">
                  +{data.config.triggerConfig.filters.length - 2} more...
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Other Config (legacy) */}
        {data.config && Object.keys(data.config).filter(k => k !== 'triggerConfig').length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="text-xs space-y-1">
              {Object.entries(data.config)
                .filter(([key]) => key !== 'triggerConfig')
                .map(([key, value]) => (
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </Card>
  );
}

export default memo(TriggerNode);

