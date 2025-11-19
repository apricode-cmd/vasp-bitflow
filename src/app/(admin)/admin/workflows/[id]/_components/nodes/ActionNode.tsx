'use client';

/**
 * Action Node Component
 * 
 * End result/action to take when workflow executes
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Ban, 
  FileText, 
  Bell, 
  UserCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export interface ActionNodeData {
  actionType: string;
  config: Record<string, any>;
}

const ACTION_CONFIG = {
  FREEZE_ORDER: {
    icon: Ban,
    label: 'Freeze Order',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    iconColor: 'text-destructive',
  },
  REJECT_TRANSACTION: {
    icon: XCircle,
    label: 'Reject Transaction',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    iconColor: 'text-destructive',
  },
  REQUEST_DOCUMENT: {
    icon: FileText,
    label: 'Request Document',
    color: 'bg-secondary/50 text-secondary-foreground border-secondary',
    iconColor: 'text-secondary-foreground',
  },
  REQUIRE_APPROVAL: {
    icon: UserCheck,
    label: 'Require Approval',
    color: 'bg-secondary/50 text-secondary-foreground border-secondary',
    iconColor: 'text-secondary-foreground',
  },
  SEND_NOTIFICATION: {
    icon: Bell,
    label: 'Send Notification',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  FLAG_FOR_REVIEW: {
    icon: AlertTriangle,
    label: 'Flag for Review',
    color: 'bg-secondary/50 text-secondary-foreground border-secondary',
    iconColor: 'text-secondary-foreground',
  },
  AUTO_APPROVE: {
    icon: CheckCircle,
    label: 'Auto Approve',
    color: 'bg-primary/10 text-primary border-primary/30',
    iconColor: 'text-primary',
  },
  ESCALATE_TO_COMPLIANCE: {
    icon: AlertTriangle,
    label: 'Escalate to Compliance',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    iconColor: 'text-destructive',
  },
};

function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const config = ACTION_CONFIG[data.actionType as keyof typeof ACTION_CONFIG] || {
    icon: FileText,
    label: data.actionType,
    color: 'bg-muted text-muted-foreground border-border',
    iconColor: 'text-muted-foreground',
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
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-background/80 ${config.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <Badge variant="outline" className="text-xs font-semibold mb-1">
              ACTION
            </Badge>
            <h3 className="font-semibold text-sm leading-tight">
              {config.label}
            </h3>
          </div>
        </div>

        {/* Config Details */}
        {Object.keys(data.config).length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="text-xs space-y-2">
              {data.config.reason && (
                <div>
                  <span className="font-medium opacity-70">Reason:</span>
                  <p className="mt-1 text-xs bg-background/60 rounded px-2 py-1">
                    {data.config.reason}
                  </p>
                </div>
              )}
              {data.config.documentType && (
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-70">Document:</span>
                  <span className="font-mono">{data.config.documentType}</span>
                </div>
              )}
              {data.config.message && (
                <div>
                  <span className="font-medium opacity-70">Message:</span>
                  <p className="mt-1 text-xs bg-background/60 rounded px-2 py-1">
                    {data.config.message}
                  </p>
                </div>
              )}
              {data.config.recipientRole && (
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-70">Recipient:</span>
                  <span className="font-mono">{data.config.recipientRole}</span>
                </div>
              )}
              {data.config.approverRole && (
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-70">Approver:</span>
                  <span className="font-mono">{data.config.approverRole}</span>
                </div>
              )}
              {data.config.minApprovals && (
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-70">Min Approvals:</span>
                  <span className="font-mono">{data.config.minApprovals}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default memo(ActionNode);

