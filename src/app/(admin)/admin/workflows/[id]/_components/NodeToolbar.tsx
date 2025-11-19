'use client';

/**
 * Node Toolbar Component
 * 
 * Drag-and-drop toolbar for adding nodes to workflow
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  GitBranch, 
  FileText,
  DollarSign,
  TrendingUp,
  FileCheck,
  UserPlus,
  Wallet,
  Ban,
  XCircle,
  Bell,
  UserCheck,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface NodeCategory {
  category: string;
  color: string;
  textColor: string;
  iconColor: string;
  nodes: Array<{
    type: string;
    icon: any;
    label: string;
    trigger?: string;
    actionType?: string;
    data?: any;
  }>;
}

const NODE_LIBRARY: NodeCategory[] = [
  {
    category: 'Triggers',
    color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
    nodes: [
      { type: 'trigger', icon: DollarSign, label: 'Order Created', trigger: 'ORDER_CREATED' },
      { type: 'trigger', icon: TrendingUp, label: 'PayIn Received', trigger: 'PAYIN_RECEIVED' },
      { type: 'trigger', icon: DollarSign, label: 'PayOut Requested', trigger: 'PAYOUT_REQUESTED' },
      { type: 'trigger', icon: FileCheck, label: 'KYC Submitted', trigger: 'KYC_SUBMITTED' },
      { type: 'trigger', icon: UserPlus, label: 'User Registered', trigger: 'USER_REGISTERED' },
      { type: 'trigger', icon: Wallet, label: 'Wallet Added', trigger: 'WALLET_ADDED' },
      { type: 'trigger', icon: Zap, label: 'Amount Threshold', trigger: 'AMOUNT_THRESHOLD' },
    ],
  },
  {
    category: 'Conditions',
    color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-900 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
    nodes: [
      { 
        type: 'condition', 
        icon: GitBranch, 
        label: 'If/Then Branch',
        data: { field: 'amount', operator: '>', value: 1000 },
      },
    ],
  },
  {
    category: 'Actions',
    color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    textColor: 'text-green-900 dark:text-green-100',
    iconColor: 'text-green-600 dark:text-green-400',
    nodes: [
      { type: 'action', icon: Ban, label: 'Freeze Order', actionType: 'FREEZE_ORDER' },
      { type: 'action', icon: XCircle, label: 'Reject Transaction', actionType: 'REJECT_TRANSACTION' },
      { type: 'action', icon: FileText, label: 'Request Document', actionType: 'REQUEST_DOCUMENT' },
      { type: 'action', icon: UserCheck, label: 'Require Approval', actionType: 'REQUIRE_APPROVAL' },
      { type: 'action', icon: Bell, label: 'Send Notification', actionType: 'SEND_NOTIFICATION' },
      { type: 'action', icon: AlertTriangle, label: 'Flag for Review', actionType: 'FLAG_FOR_REVIEW' },
      { type: 'action', icon: CheckCircle, label: 'Auto Approve', actionType: 'AUTO_APPROVE' },
      { type: 'action', icon: AlertTriangle, label: 'Escalate', actionType: 'ESCALATE_TO_COMPLIANCE' },
    ],
  },
];

interface NodeToolbarProps {
  onAddNode?: (nodeType: string, nodeData: any) => void;
}

export default function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  const handleDragStart = (event: React.DragEvent, nodeType: string, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, nodeData }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-semibold text-sm mb-1 text-foreground">Node Library</h3>
        <p className="text-xs text-muted-foreground">Drag and drop to canvas</p>
      </div>

      {NODE_LIBRARY.map((category) => (
        <div key={category.category}>
          <Badge variant="outline" className="mb-2 text-xs">
            {category.category}
          </Badge>
          <div className="space-y-2">
            {category.nodes.map((node, idx) => {
              const Icon = node.icon;
              const nodeData = {
                ...(node.type === 'trigger' && { trigger: node.trigger }),
                ...(node.type === 'condition' && node.data),
                ...(node.type === 'action' && { actionType: node.actionType, config: {} }),
              };

              return (
                <Card
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.type, nodeData)}
                  className={`
                    p-3 cursor-grab active:cursor-grabbing
                    ${category.color}
                    hover:shadow-lg hover:scale-[1.02] transition-all duration-200
                    border
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${category.iconColor}`} />
                    <span className={`text-xs font-medium truncate ${category.textColor}`}>{node.label}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

