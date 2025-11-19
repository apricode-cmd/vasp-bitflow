'use client';

/**
 * Node Toolbar Component
 * 
 * Enhanced drag-and-drop toolbar with search, collapsible categories, and descriptions
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Globe,
  Search,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';

interface NodeDefinition {
  type: string;
  icon: any;
  label: string;
  description: string;
  trigger?: string;
  actionType?: string;
  data?: any;
}

interface NodeCategory {
  category: string;
  color: string;
  textColor: string;
  iconColor: string;
  bgColor: string;
  nodes: NodeDefinition[];
}

const NODE_LIBRARY: NodeCategory[] = [
  {
    category: 'Triggers',
    color: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    nodes: [
      { 
        type: 'trigger', 
        icon: DollarSign, 
        label: 'Order Created', 
        description: 'Triggers when a new order is created by a customer',
        trigger: 'ORDER_CREATED' 
      },
      { 
        type: 'trigger', 
        icon: TrendingUp, 
        label: 'PayIn Received', 
        description: 'Triggers when a payment is received from customer',
        trigger: 'PAYIN_RECEIVED' 
      },
      { 
        type: 'trigger', 
        icon: DollarSign, 
        label: 'PayOut Requested', 
        description: 'Triggers when a payout is requested by customer',
        trigger: 'PAYOUT_REQUESTED' 
      },
      { 
        type: 'trigger', 
        icon: FileCheck, 
        label: 'KYC Submitted', 
        description: 'Triggers when customer submits KYC documents',
        trigger: 'KYC_SUBMITTED' 
      },
      { 
        type: 'trigger', 
        icon: UserPlus, 
        label: 'User Registered', 
        description: 'Triggers when a new user registers on the platform',
        trigger: 'USER_REGISTERED' 
      },
      { 
        type: 'trigger', 
        icon: Wallet, 
        label: 'Wallet Added', 
        description: 'Triggers when customer adds a crypto wallet address',
        trigger: 'WALLET_ADDED' 
      },
      { 
        type: 'trigger', 
        icon: Zap, 
        label: 'Amount Threshold', 
        description: 'Triggers when transaction amount exceeds threshold',
        trigger: 'AMOUNT_THRESHOLD' 
      },
    ],
  },
  {
    category: 'Conditions',
    color: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-900 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    nodes: [
      { 
        type: 'condition', 
        icon: GitBranch, 
        label: 'If/Then Branch',
        description: 'Creates conditional logic with true/false branches',
        data: { field: 'amount', operator: '>', value: 1000 },
      },
    ],
  },
  {
    category: 'Actions',
    color: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-900 dark:text-green-100',
    iconColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    nodes: [
      { 
        type: 'action', 
        icon: Ban, 
        label: 'Freeze Order', 
        description: 'Temporarily freeze an order pending review',
        actionType: 'FREEZE_ORDER' 
      },
      { 
        type: 'action', 
        icon: XCircle, 
        label: 'Reject Transaction', 
        description: 'Reject a transaction with specified reason',
        actionType: 'REJECT_TRANSACTION' 
      },
      { 
        type: 'action', 
        icon: FileText, 
        label: 'Request Document', 
        description: 'Request additional documents from customer',
        actionType: 'REQUEST_DOCUMENT' 
      },
      { 
        type: 'action', 
        icon: UserCheck, 
        label: 'Require Approval', 
        description: 'Route to admin for manual approval',
        actionType: 'REQUIRE_APPROVAL' 
      },
      { 
        type: 'action', 
        icon: Bell, 
        label: 'Send Notification', 
        description: 'Send email/SMS notification to customer or admin',
        actionType: 'SEND_NOTIFICATION' 
      },
      { 
        type: 'action', 
        icon: AlertTriangle, 
        label: 'Flag for Review', 
        description: 'Mark transaction for manual compliance review',
        actionType: 'FLAG_FOR_REVIEW' 
      },
      { 
        type: 'action', 
        icon: CheckCircle, 
        label: 'Auto Approve', 
        description: 'Automatically approve transaction if conditions met',
        actionType: 'AUTO_APPROVE' 
      },
      { 
        type: 'action', 
        icon: AlertTriangle, 
        label: 'Escalate', 
        description: 'Escalate case to compliance team',
        actionType: 'ESCALATE_TO_COMPLIANCE' 
      },
      { 
        type: 'action', 
        icon: Globe, 
        label: 'HTTP Request', 
        description: 'Send HTTP request to external API or webhook',
        actionType: 'HTTP_REQUEST' 
      },
    ],
  },
];

interface NodeToolbarProps {
  onAddNode?: (nodeType: string, nodeData: any) => void;
  currentNodes?: Array<{ type: string; data?: any }>;
}

export default function NodeToolbar({ onAddNode, currentNodes = [] }: NodeToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<NodeDefinition | null>(null);

  // Filter nodes based on search
  const filteredLibrary = useMemo(() => {
    if (!searchQuery.trim()) return NODE_LIBRARY;

    const query = searchQuery.toLowerCase();
    return NODE_LIBRARY.map(category => ({
      ...category,
      nodes: category.nodes.filter(node => 
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query) ||
        (node.trigger && node.trigger.toLowerCase().includes(query)) ||
        (node.actionType && node.actionType.toLowerCase().includes(query))
      ),
    })).filter(category => category.nodes.length > 0);
  }, [searchQuery]);

  // Count node usage in current workflow
  const getNodeUsageCount = (node: NodeDefinition): number => {
    return currentNodes.filter(n => {
      if (node.type === 'trigger') return n.type === 'trigger' && n.data?.trigger === node.trigger;
      if (node.type === 'action') return n.type === 'action' && n.data?.actionType === node.actionType;
      if (node.type === 'condition') return n.type === 'condition';
      return false;
    }).length;
  };

  const handleDragStart = (event: React.DragEvent, node: NodeDefinition) => {
    const nodeData = {
      ...(node.type === 'trigger' && { trigger: node.trigger }),
      ...(node.type === 'condition' && node.data),
      ...(node.type === 'action' && { actionType: node.actionType, config: {} }),
    };

    event.dataTransfer.setData('application/reactflow', JSON.stringify({ 
      nodeType: node.type, 
      nodeData 
    }));
    event.dataTransfer.effectAllowed = 'move';
    setDraggedNode(node);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-3 py-2 border-b">
          <h3 className="font-semibold text-sm mb-0.5 text-foreground">Node Library</h3>
          <p className="text-xs text-muted-foreground">Drag nodes to canvas</p>
        </div>

        {/* Search */}
        <div className="px-2.5 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-0.5 top-0.5 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {filteredLibrary.reduce((acc, cat) => acc + cat.nodes.length, 0)} results
            </p>
          )}
        </div>

        {/* Node Categories */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2.5">
          {filteredLibrary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No nodes found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredLibrary.map((category) => {
              const isCollapsed = collapsedCategories.has(category.category);
              
              return (
                <div key={category.category}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.category)}
                    className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                  >
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${category.textColor} ${category.color}`}
                    >
                      {category.category} ({category.nodes.length})
                    </Badge>
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Nodes */}
                  {!isCollapsed && (
                    <div className="space-y-1">
                      {category.nodes.map((node, idx) => {
                        const Icon = node.icon;
                        const usageCount = getNodeUsageCount(node);

                        return (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <Card
                                draggable
                                onDragStart={(e) => handleDragStart(e, node)}
                                onDragEnd={handleDragEnd}
                                className={`
                                  p-2 cursor-grab active:cursor-grabbing
                                  ${category.color} ${category.bgColor}
                                  hover:shadow-md hover:scale-[1.01] 
                                  transition-all duration-150
                                  border
                                  ${draggedNode === node ? 'opacity-50' : 'opacity-100'}
                                `}
                              >
                                <div className="flex items-start gap-2">
                                  <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${category.iconColor}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-xs font-medium truncate ${category.textColor}`}>
                                        {node.label}
                                      </span>
                                      {usageCount > 0 && (
                                        <Badge 
                                          variant="secondary" 
                                          className="h-4 px-1.5 text-[10px] font-normal"
                                        >
                                          {usageCount}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                      {node.description}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold text-xs">{node.label}</p>
                                <p className="text-xs text-muted-foreground">{node.description}</p>
                                {usageCount > 0 && (
                                  <p className="text-xs text-muted-foreground italic">
                                    Used {usageCount}× in this workflow
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-2.5 py-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{NODE_LIBRARY.reduce((acc, cat) => acc + cat.nodes.length, 0)} nodes</span>
            <span>{currentNodes.length} in workflow</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

