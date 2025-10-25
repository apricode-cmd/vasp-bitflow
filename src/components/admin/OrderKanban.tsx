/**
 * Order Kanban Board Component
 * 
 * Beautiful drag-and-drop kanban board with modern animations and UX
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  GripVertical, Eye, CheckCircle, XCircle, 
  Clock, DollarSign, User, ArrowRight, Package,
  Mail, Calendar, Wallet, TrendingUp
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
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onOrderClick?: (order: Order) => void;
}

const KANBAN_COLUMNS = [
  { 
    id: 'PENDING' as OrderStatus, 
    label: 'Pending', 
    description: 'Awaiting payment',
    color: 'border-yellow-500',
    bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  { 
    id: 'PAYMENT_PENDING' as OrderStatus, 
    label: 'Payment Pending', 
    description: 'Payment uploaded',
    color: 'border-orange-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10',
    icon: DollarSign,
    iconColor: 'text-orange-600'
  },
  { 
    id: 'PROCESSING' as OrderStatus, 
    label: 'Processing', 
    description: 'Being processed',
    color: 'border-blue-500',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10',
    icon: TrendingUp,
    iconColor: 'text-blue-600'
  },
  { 
    id: 'COMPLETED' as OrderStatus, 
    label: 'Completed', 
    description: 'Successfully completed',
    color: 'border-green-500',
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10',
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  { 
    id: 'CANCELLED' as OrderStatus, 
    label: 'Cancelled', 
    description: 'Cancelled orders',
    color: 'border-red-500',
    bgColor: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10',
    icon: XCircle,
    iconColor: 'text-red-600'
  }
];

export function OrderKanban({ orders, onStatusChange, onOrderClick }: OrderKanbanProps): JSX.Element {
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);

  const handleDragStart = (order: Order, e: React.DragEvent): void => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent): void => {
    setDraggedOrder(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, columnId: OrderStatus): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
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

    try {
      await onStatusChange(draggedOrder.id, newStatus);
      toast.success(`Order moved to ${newStatus.toLowerCase().replace('_', ' ')}`);
    } catch (error) {
      console.error('Status change error:', error);
      toast.error('Failed to update order status');
    } finally {
      setDraggedOrder(null);
    }
  };

  const getOrdersByStatus = (status: OrderStatus): Order[] => {
    return orders.filter(order => order.status === status);
  };

  const calculateColumnTotal = (orders: Order[]): number => {
    return orders.reduce((sum, order) => sum + order.totalFiat, 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {KANBAN_COLUMNS.map((column) => {
        const columnOrders = getOrdersByStatus(column.id);
        const Icon = column.icon;
        const isDragOver = dragOverColumn === column.id;
        const columnTotal = calculateColumnTotal(columnOrders);

        return (
          <div
            key={column.id}
            className={`flex flex-col rounded-xl border-2 transition-all duration-300 ${
              isDragOver 
                ? `${column.color} border-dashed shadow-lg scale-105` 
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
                  <div className={`h-10 w-10 rounded-lg bg-background/80 flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${column.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{column.label}</h3>
                    <p className="text-xs text-muted-foreground">{column.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-semibold">
                  {columnOrders.length}
                </Badge>
                {columnTotal > 0 && (
                  <span className="text-xs font-bold">
                    {formatCurrency(columnTotal, 'EUR')}
                  </span>
                )}
              </div>
            </div>

            {/* Column Content */}
            <ScrollArea className="flex-1 h-[calc(100vh-340px)] p-3">
              <div className="space-y-3">
                {columnOrders.map((order) => {
                  const userInitials = `${order.user.profile?.firstName?.charAt(0) || ''}${order.user.profile?.lastName?.charAt(0) || 'U'}`;
                  
                  return (
                    <ContextMenu key={order.id}>
                      <ContextMenuTrigger>
                        <HoverCard openDelay={300}>
                          <HoverCardTrigger asChild>
                            <Card
                              draggable
                              onDragStart={(e) => handleDragStart(order, e)}
                              onDragEnd={handleDragEnd}
                              className={`cursor-move hover:shadow-lg hover:border-primary/50 transition-all group ${
                                draggedOrder?.id === order.id ? 'opacity-50 scale-95 rotate-2' : 'hover:-translate-y-1'
                              }`}
                              onClick={() => onOrderClick?.(order)}
                            >
                              <CardContent className="p-4 space-y-3">
                                {/* Drag Handle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
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
                                    <Badge variant="secondary" className="font-mono">
                                      {order.cryptoAmount} {order.currencyCode}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total:</span>
                                    <span className="font-bold text-sm">
                                      {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                                    </span>
                                  </div>
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
                                <h4 className="font-semibold mb-2">Order Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Reference:</span>
                                    <span className="font-mono">{order.paymentReference}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">
                                      {order.user.profile?.firstName} {order.user.profile?.lastName}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium">{order.user.email}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
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
                                </div>
                              </div>
                              <Separator />
                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={() => onOrderClick?.(order)}
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
                        <ContextMenuItem asChild>
                          <a href={`/admin/users/${order.user.id}`}>
                            <User className="h-4 w-4 mr-2" />
                            View Customer
                          </a>
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {column.id === 'PENDING' && (
                          <ContextMenuItem onClick={() => onStatusChange(order.id, 'PROCESSING')}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Move to Processing
                          </ContextMenuItem>
                        )}
                        {column.id === 'PAYMENT_PENDING' && (
                          <ContextMenuItem onClick={() => onStatusChange(order.id, 'PROCESSING')}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Move to Processing
                          </ContextMenuItem>
                        )}
                        {column.id === 'PROCESSING' && (
                          <ContextMenuItem onClick={() => onStatusChange(order.id, 'COMPLETED')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete Order
                          </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          onClick={() => onStatusChange(order.id, 'CANCELLED')}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Order
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}

                {/* Empty State */}
                {columnOrders.length === 0 && (
                  <div className={`text-center py-16 border-2 border-dashed rounded-xl transition-all ${
                    isDragOver 
                      ? `${column.color} bg-accent/50 scale-105` 
                      : 'border-border bg-muted/20'
                  }`}>
                    <div className="space-y-2">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                        isDragOver ? column.bgColor : 'bg-muted'
                      }`}>
                        <Icon className={`h-6 w-6 ${isDragOver ? column.iconColor : 'text-muted-foreground'}`} />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isDragOver ? 'Drop here' : 'No orders'}
                      </p>
                      {isDragOver && (
                        <p className="text-xs text-muted-foreground">
                          Release to move order
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
  );
}
