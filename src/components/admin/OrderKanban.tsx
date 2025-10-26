/**
 * Enterprise Order Kanban Board Component
 * 
 * Features:
 * - Smart status validation & transitions
 * - Beautiful drag-and-drop with animations
 * - Advanced filters & search
 * - Bulk actions support
 * - Real-time updates
 * - Smart PayIn/PayOut creation on status transitions
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { OrderTransitionDialog } from './OrderTransitionDialog';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  GripVertical, Eye, CheckCircle, XCircle, 
  Clock, DollarSign, User, ArrowRight, Package,
  Mail, Calendar, Wallet, TrendingUp, AlertCircle,
  Search, X, Filter, CheckSquare, Trash2, PlayCircle,
  Ban, Sparkles, ShieldCheck, CreditCard
} from 'lucide-react';
import type { OrderStatus } from '@prisma/client';

interface Order {
  id: string;
  paymentReference: string;
  cryptoAmount: number;
  currencyCode: string;
  fiatCurrencyCode: string;
  totalFiat: number;
  status: OrderStatus;
  createdAt: string;
  paymentMethodCode?: string | null;
  paymentMethod?: {
    code: string;
    name: string;
    type: string;
  } | null;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
}

interface OrderKanbanProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus, transitionData?: any) => Promise<void>;
  onOrderClick?: (order: Order) => void;
  paymentMethods?: any[];
  fiatCurrencies?: any[];
  cryptocurrencies?: any[];
  networks?: any[];
}

// Status transition rules (what statuses can be changed to from current status)
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAYMENT_PENDING', 'PROCESSING', 'CANCELLED'],
  PAYMENT_PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal status
  CANCELLED: [], // Terminal status
  REFUNDED: [], // Terminal status
  EXPIRED: ['PENDING'], // Can be reactivated
};

// Enhanced status definitions with better UX
const KANBAN_COLUMNS = [
  { 
    id: 'PENDING' as OrderStatus, 
    label: 'New Orders', 
    description: 'Awaiting customer payment',
    helpText: 'Orders waiting for customer to send payment',
    color: 'border-amber-500',
    bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10',
    icon: Clock,
    iconColor: 'text-amber-600',
    allowedTransitions: STATUS_TRANSITIONS.PENDING
  },
  { 
    id: 'PAYMENT_PENDING' as OrderStatus, 
    label: 'Payment Received', 
    description: 'Proof uploaded, needs verification',
    helpText: 'Customer uploaded payment proof, verify and process',
    color: 'border-orange-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10',
    icon: DollarSign,
    iconColor: 'text-orange-600',
    allowedTransitions: STATUS_TRANSITIONS.PAYMENT_PENDING
  },
  { 
    id: 'PROCESSING' as OrderStatus, 
    label: 'Processing', 
    description: 'Preparing crypto transfer',
    helpText: 'Payment verified, preparing to send cryptocurrency',
    color: 'border-blue-500',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10',
    icon: TrendingUp,
    iconColor: 'text-blue-600',
    allowedTransitions: STATUS_TRANSITIONS.PROCESSING
  },
  { 
    id: 'COMPLETED' as OrderStatus, 
    label: 'Completed', 
    description: 'Crypto sent successfully',
    helpText: 'Cryptocurrency transferred to customer wallet',
    color: 'border-green-500',
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    allowedTransitions: STATUS_TRANSITIONS.COMPLETED
  },
  { 
    id: 'CANCELLED' as OrderStatus, 
    label: 'Cancelled', 
    description: 'Cancelled by admin/system',
    helpText: 'Orders that were cancelled or expired',
    color: 'border-red-500',
    bgColor: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10',
    icon: XCircle,
    iconColor: 'text-red-600',
    allowedTransitions: STATUS_TRANSITIONS.CANCELLED
  }
];

export function OrderKanban({ 
  orders, 
  onStatusChange, 
  onOrderClick,
  paymentMethods = [],
  fiatCurrencies = [],
  cryptocurrencies = [],
  networks = []
}: OrderKanbanProps): JSX.Element {  
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    action: 'complete' | 'cancel' | 'process' | null;
  }>({ open: false, action: null });
  
  // NEW: Transition dialog state
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    order: Order | null;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus | null;
  }>({
    open: false,
    order: null,
    fromStatus: null,
    toStatus: null
  });

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    orderId: string | null;
    orderReference: string | null;
  }>({
    open: false,
    orderId: null,
    orderReference: null
  });

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<'all' | '1h' | '24h' | '7d' | '30d'>('all');

  // Validate if status transition is allowed
  const isTransitionAllowed = (from: OrderStatus, to: OrderStatus): boolean => {
    return STATUS_TRANSITIONS[from]?.includes(to) || false;
  };

  // Filter orders by search, currency, and time
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = searchQuery === '' || 
        order.paymentReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${order.user.profile?.firstName} ${order.user.profile?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCurrency = currencyFilter === 'all' || order.currencyCode === currencyFilter;
      
      // Time filter
      let matchesTime = true;
      if (timeFilter !== 'all') {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - orderDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        switch (timeFilter) {
          case '1h':
            matchesTime = diffHours <= 1;
            break;
          case '24h':
            matchesTime = diffHours <= 24;
            break;
          case '7d':
            matchesTime = diffHours <= 24 * 7;
            break;
          case '30d':
            matchesTime = diffHours <= 24 * 30;
            break;
        }
      }
      
      return matchesSearch && matchesCurrency && matchesTime;
    });
  }, [orders, searchQuery, currencyFilter, timeFilter]);

  // Get unique currencies for filter
  const availableCurrencies = useMemo(() => {
    const currencies = new Set(orders.map(o => o.currencyCode));
    return Array.from(currencies);
  }, [orders]);

  // Toggle order selection
  const toggleOrderSelection = (orderId: string): void => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Select all orders in view
  const selectAllOrders = (): void => {
    const allIds = new Set(filteredOrders.map(o => o.id));
    setSelectedOrders(allIds);
  };

  // Clear selection
  const clearSelection = (): void => {
    setSelectedOrders(new Set());
  };

  // Bulk action handlers
  const handleBulkAction = (action: 'complete' | 'cancel' | 'process'): void => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }
    setBulkActionDialog({ open: true, action });
  };

  const executeBulkAction = async (): Promise<void> => {
    if (!bulkActionDialog.action) return;

    const statusMap: Record<typeof bulkActionDialog.action, OrderStatus> = {
      complete: 'COMPLETED',
      cancel: 'CANCELLED',
      process: 'PROCESSING'
    };

    const newStatus = statusMap[bulkActionDialog.action];
    const selectedOrdersList = Array.from(selectedOrders);

    toast.loading(`Processing ${selectedOrdersList.length} orders...`);

    let successCount = 0;
    let errorCount = 0;

    for (const orderId of selectedOrdersList) {
      try {
        const order = orders.find(o => o.id === orderId);
        if (order && isTransitionAllowed(order.status, newStatus)) {
          await onStatusChange(orderId, newStatus);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to update order ${orderId}:`, error);
      }
    }

    toast.dismiss();
    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} order(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to update ${errorCount} order(s)`);
    }

    setBulkActionDialog({ open: false, action: null });
    clearSelection();
  };

  const handleDragStart = (order: Order, e: React.DragEvent): void => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50', 'scale-95', 'rotate-2');
    }
  };

  const handleDragEnd = (e: React.DragEvent): void => {
    setDraggedOrder(null);
    setDragOverColumn(null);
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('opacity-50', 'scale-95', 'rotate-2');
    }
  };

  const handleDragOver = (e: React.DragEvent, columnId: OrderStatus): void => {
    e.preventDefault();
    
    // Check if transition is allowed
    if (draggedOrder && isTransitionAllowed(draggedOrder.status, columnId)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(columnId);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDragOverColumn(null);
    }
  };

  const handleDragLeave = (): void => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OrderStatus): Promise<void> => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedOrder) return;

    if (draggedOrder.status === newStatus) {
      setDraggedOrder(null);
      return;
    }

    // Validate transition
    if (!isTransitionAllowed(draggedOrder.status, newStatus)) {
      toast.error(
        `Cannot move order from ${draggedOrder.status} to ${newStatus}`,
        {
          description: 'This status transition is not allowed'
        }
      );
      setDraggedOrder(null);
      return;
    }

    // Check if this transition requires additional data
    const requiresPayIn = draggedOrder.status === 'PENDING' && newStatus === 'PAYMENT_PENDING';
    const requiresPayOut = draggedOrder.status === 'PROCESSING' && newStatus === 'COMPLETED';

    if (requiresPayIn || requiresPayOut) {
      // Show dialog to collect PayIn/PayOut data
      setTransitionDialog({
        open: true,
        order: draggedOrder,
        fromStatus: draggedOrder.status,
        toStatus: newStatus
      });
      setDraggedOrder(null);
      return;
    }

    // Simple status change (no additional data needed)
    try {
      await onStatusChange(draggedOrder.id, newStatus);
      
      const column = KANBAN_COLUMNS.find(c => c.id === newStatus);
      toast.success(
        `Order moved to ${column?.label}`,
        {
          description: `#${draggedOrder.paymentReference.slice(-6)}`
        }
      );
    } catch (error) {
      console.error('Status change error:', error);
      toast.error('Failed to update order status');
    } finally {
      setDraggedOrder(null);
    }
  };

  const getOrdersByStatus = (status: OrderStatus): Order[] => {
    return filteredOrders.filter(order => order.status === status);
  };

  const calculateColumnTotal = (orders: Order[]): number => {
    return orders.reduce((sum, order) => sum + order.totalFiat, 0);
  };
  
  // NEW: Handle transition dialog confirmation
  const handleTransitionConfirm = async (data: any): Promise<void> => {
    if (!transitionDialog.order) return;
    
    try {
      // Pass the full transition data to parent
      await onStatusChange(transitionDialog.order.id, data.status, data);
      
      const column = KANBAN_COLUMNS.find(c => c.id === data.status);
      toast.success(
        `Order moved to ${column?.label}`,
        {
          description: `#${transitionDialog.order.paymentReference.slice(-6)}`
        }
      );
      
      // Close dialog
      setTransitionDialog({
        open: false,
        order: null,
        fromStatus: null,
        toStatus: null
      });
    } catch (error) {
      console.error('Transition error:', error);
      toast.error('Failed to update order');
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (): Promise<void> => {
    if (!deleteDialog.orderId) return;

    try {
      const response = await fetch(`/api/admin/orders/${deleteDialog.orderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Order deleted successfully', {
          description: `#${deleteDialog.orderReference}`
        });
        // Refresh orders by calling parent callback
        window.location.reload(); // Simple refresh, or you can pass a callback from parent
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Delete order error:', error);
      toast.error('An error occurred');
    } finally {
      setDeleteDialog({ open: false, orderId: null, orderReference: null });
    }
  };

  // Calculate order counts for each time filter
  const timeFilterCounts = useMemo(() => {
    const now = new Date();
    return {
      '1h': orders.filter(o => (now.getTime() - new Date(o.createdAt).getTime()) <= 1000 * 60 * 60).length,
      '24h': orders.filter(o => (now.getTime() - new Date(o.createdAt).getTime()) <= 1000 * 60 * 60 * 24).length,
      '7d': orders.filter(o => (now.getTime() - new Date(o.createdAt).getTime()) <= 1000 * 60 * 60 * 24 * 7).length,
      '30d': orders.filter(o => (now.getTime() - new Date(o.createdAt).getTime()) <= 1000 * 60 * 60 * 24 * 30).length,
      'all': orders.length
    };
  }, [orders]);

  // Save time filter to localStorage
  useEffect(() => {
    localStorage.setItem('orderKanbanTimeFilter', timeFilter);
  }, [timeFilter]);

  // Load time filter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('orderKanbanTimeFilter');
    if (saved && ['all', '1h', '24h', '7d', '30d'].includes(saved)) {
      setTimeFilter(saved as any);
    }
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters & Search Bar */}
        <Card>
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, email, or customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Currency Filter */}
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Filter */}
              <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Time
                    <Badge variant="outline" className="ml-2">{timeFilterCounts.all}</Badge>
                  </SelectItem>
                  <SelectItem value="1h">
                    Last Hour
                    <Badge variant="outline" className="ml-2">{timeFilterCounts['1h']}</Badge>
                  </SelectItem>
                  <SelectItem value="24h">
                    Last 24 Hours
                    <Badge variant="outline" className="ml-2">{timeFilterCounts['24h']}</Badge>
                  </SelectItem>
                  <SelectItem value="7d">
                    Last 7 Days
                    <Badge variant="outline" className="ml-2">{timeFilterCounts['7d']}</Badge>
                  </SelectItem>
                  <SelectItem value="30d">
                    Last 30 Days
                    <Badge variant="outline" className="ml-2">{timeFilterCounts['30d']}</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Bulk Actions Toggle */}
              {selectedOrders.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedOrders.size} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedOrders.size > 0 && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">
                    {selectedOrders.size} order(s) selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllOrders}
                  >
                    Select All ({filteredOrders.length})
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('process')}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Process
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move to Processing</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('complete')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as Completed</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkAction('cancel')}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel Orders</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnOrders = getOrdersByStatus(column.id);
            const Icon = column.icon;
            const isDragOver = dragOverColumn === column.id;
            const isDropAllowed = draggedOrder && isTransitionAllowed(draggedOrder.status, column.id);
            const columnTotal = calculateColumnTotal(columnOrders);

            return (
              <div
                key={column.id}
                className={`flex flex-col rounded-xl border-2 transition-all duration-300 ${
                  isDragOver && isDropAllowed
                    ? `${column.color} border-dashed shadow-lg scale-[1.02]` 
                    : isDragOver && !isDropAllowed
                    ? 'border-red-500 border-dashed opacity-50'
                    : 'border-border'
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`${column.bgColor} rounded-t-lg p-4 border-b`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`h-10 w-10 rounded-lg bg-background/80 flex items-center justify-center shadow-sm cursor-help`}>
                            <Icon className={`h-5 w-5 ${column.iconColor}`} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-semibold">{column.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{column.helpText}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div>
                        <h3 className="font-bold text-sm">{column.label}</h3>
                        <p className="text-xs text-muted-foreground">{column.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-semibold">
                      {columnOrders.length} {columnOrders.length === 1 ? 'order' : 'orders'}
                    </Badge>
                    {columnTotal > 0 && (
                      <span className="text-xs font-bold">
                        {formatCurrency(columnTotal, 'EUR')}
                      </span>
                    )}
                  </div>

                  {/* Drop zone indicator */}
                  {isDragOver && (
                    <div className="mt-3 p-2 bg-background/60 rounded-md border border-dashed border-current">
                      <p className="text-xs text-center font-medium">
                        {isDropAllowed ? (
                          <>
                            <Sparkles className="inline h-3 w-3 mr-1" />
                            Drop to move here
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="inline h-3 w-3 mr-1" />
                            Not allowed
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Column Content */}
                <ScrollArea className="flex-1 h-[calc(100vh-380px)] p-3">
                  <div className="space-y-3">
                    {columnOrders.map((order) => {
                      const userInitials = `${order.user.profile?.firstName?.charAt(0) || ''}${order.user.profile?.lastName?.charAt(0) || 'U'}`;
                      const isSelected = selectedOrders.has(order.id);
                      
                      return (
                        <ContextMenu key={order.id}>
                          <ContextMenuTrigger>
                            <HoverCard openDelay={300}>
                              <HoverCardTrigger asChild>
                                <Card
                                  draggable
                                  onDragStart={(e) => handleDragStart(order, e)}
                                  onDragEnd={handleDragEnd}
                                  className={`cursor-move hover:shadow-lg transition-all group relative ${
                                    isSelected 
                                      ? 'ring-2 ring-primary border-primary' 
                                      : 'hover:border-primary/50'
                                  } ${
                                    draggedOrder?.id === order.id 
                                      ? '' // Classes applied via classList in handleDragStart
                                      : 'hover:-translate-y-1'
                                  }`}
                                  onClick={(e) => {
                                    if (e.shiftKey) {
                                      e.stopPropagation();
                                      toggleOrderSelection(order.id);
                                    } else {
                                      onOrderClick?.(order);
                                    }
                                  }}
                                >
                                  <CardContent className="p-4 space-y-3">
                                    {/* Selection Checkbox & Drag Handle */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleOrderSelection(order.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        />
                                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Badge variant="outline" className="font-mono text-xs">
                                          #{order.paymentReference.slice(-6)}
                                        </Badge>
                                      </div>
                                      <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    {/* User Info */}
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                        <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">
                                          {userInitials}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate">
                                          {order.user.profile?.firstName} {order.user.profile?.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {order.user.email}
                                        </p>
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Order Details */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Amount:</span>
                                        <Badge variant="secondary" className="font-mono text-xs">
                                          {order.cryptoAmount} {order.currencyCode}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Total:</span>
                                        <span className="font-bold text-sm">
                                          {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                                        </span>
                                      </div>
                                      {order.paymentMethod && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-muted-foreground">Payment:</span>
                                          <Badge variant="outline" className="text-xs">
                                            {order.paymentMethod.name}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>

                                    <Separator />

                                    {/* Date */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(new Date(order.createdAt))}
                                    </div>
                                  </CardContent>
                                </Card>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80" side="right">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-semibold mb-2">Order Preview</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Reference:</span>
                                        <span className="font-mono text-xs">{order.paymentReference}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Customer:</span>
                                        <span className="font-medium">
                                          {order.user.profile?.firstName} {order.user.profile?.lastName}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Email:</span>
                                        <span className="font-medium text-xs">{order.user.email}</span>
                                      </div>
                                      <Separator />
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Crypto:</span>
                                        <span className="font-medium">
                                          {order.cryptoAmount} {order.currencyCode}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span className="font-bold">
                                          {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                                        </span>
                                      </div>
                                      {order.paymentMethod && (
                                        <>
                                          <Separator />
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Method:</span>
                                            <div className="flex items-center gap-1">
                                              <CreditCard className="h-3 w-3 text-muted-foreground" />
                                              <span className="font-medium text-xs">{order.paymentMethod.name}</span>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <Separator />
                                  <Button 
                                    size="sm" 
                                    className="w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOrderClick?.(order);
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-2" />
                                    View Full Details
                                  </Button>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => onOrderClick?.(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => toggleOrderSelection(order.id)}>
                              <CheckSquare className="h-4 w-4 mr-2" />
                              {isSelected ? 'Deselect' : 'Select'}
                            </ContextMenuItem>
                            <ContextMenuItem asChild>
                              <a href={`/admin/users/${order.user.id}`}>
                                <User className="h-4 w-4 mr-2" />
                                View Customer
                              </a>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            {column.allowedTransitions.length > 0 && (
                              <>
                                {column.allowedTransitions.map((status) => {
                                  const targetColumn = KANBAN_COLUMNS.find(c => c.id === status);
                                  if (!targetColumn) return null;
                                  const TargetIcon = targetColumn.icon;
                                  return (
                                    <ContextMenuItem 
                                      key={status}
                                      onClick={() => onStatusChange(order.id, status)}
                                    >
                                      <TargetIcon className="h-4 w-4 mr-2" />
                                      Move to {targetColumn.label}
                                    </ContextMenuItem>
                                  );
                                })}
                                <ContextMenuSeparator />
                              </>
                            )}
                            {column.allowedTransitions.includes('CANCELLED' as OrderStatus) && (
                              <ContextMenuItem 
                                onClick={() => onStatusChange(order.id, 'CANCELLED')}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Order
                              </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() => {
                                setDeleteDialog({
                                  open: true,
                                  orderId: order.id,
                                  orderReference: order.paymentReference
                                });
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Order
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}

                    {/* Empty State */}
                    {columnOrders.length === 0 && (
                      <div className={`text-center py-16 border-2 border-dashed rounded-xl transition-all ${
                        isDragOver && isDropAllowed
                          ? `${column.color} bg-accent/50 scale-105` 
                          : isDragOver && !isDropAllowed
                          ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                          : 'border-border bg-muted/20'
                      }`}>
                        <div className="space-y-2">
                          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                            isDragOver && isDropAllowed
                              ? column.bgColor 
                              : isDragOver && !isDropAllowed
                              ? 'bg-red-100 dark:bg-red-950/40'
                              : 'bg-muted'
                          }`}>
                            <Icon className={`h-6 w-6 ${
                              isDragOver && isDropAllowed
                                ? column.iconColor 
                                : isDragOver && !isDropAllowed
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {isDragOver && isDropAllowed
                              ? 'Drop here' 
                              : isDragOver && !isDropAllowed
                              ? 'Not allowed'
                              : 'No orders'}
                          </p>
                          {isDragOver && (
                            <p className="text-xs text-muted-foreground">
                              {isDropAllowed
                                ? 'Release to move order'
                                : 'This status transition is not allowed'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>

        {/* Bulk Action Confirmation Dialog */}
        <AlertDialog open={bulkActionDialog.open} onOpenChange={(open) => setBulkActionDialog({ ...bulkActionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkActionDialog.action === 'cancel' && 'Cancel Selected Orders?'}
                {bulkActionDialog.action === 'complete' && 'Complete Selected Orders?'}
                {bulkActionDialog.action === 'process' && 'Process Selected Orders?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {bulkActionDialog.action === 'cancel' && (
                  <>This will cancel {selectedOrders.size} order(s). Customers will be notified. This action cannot be undone.</>
                )}
                {bulkActionDialog.action === 'complete' && (
                  <>This will mark {selectedOrders.size} order(s) as completed. Make sure cryptocurrency has been sent.</>
                )}
                {bulkActionDialog.action === 'process' && (
                  <>This will move {selectedOrders.size} order(s) to processing status.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeBulkAction}
                className={bulkActionDialog.action === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {bulkActionDialog.action === 'cancel' && 'Cancel Orders'}
                {bulkActionDialog.action === 'complete' && 'Complete Orders'}
                {bulkActionDialog.action === 'process' && 'Process Orders'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Transition Dialog with PayIn/PayOut */}
        {transitionDialog.order && transitionDialog.fromStatus && transitionDialog.toStatus && (
          <OrderTransitionDialog
            open={transitionDialog.open}
            onOpenChange={(open) => setTransitionDialog({ ...transitionDialog, open })}
            order={transitionDialog.order}
            fromStatus={transitionDialog.fromStatus}
            toStatus={transitionDialog.toStatus}
            onConfirm={handleTransitionConfirm}
            paymentMethods={paymentMethods}
            fiatCurrencies={fiatCurrencies}
            cryptocurrencies={cryptocurrencies}
            networks={networks}
          />
        )}

        {/* Delete Order Confirmation Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete order <span className="font-mono font-semibold">{deleteDialog.orderReference}</span>?
                <br /><br />
                <span className="text-destructive font-medium">This action cannot be undone.</span> All related data (PayIn, PayOut, history) will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
