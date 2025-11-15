/**
 * Order Header Component
 * Displays order main info, status, and quick actions
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { 
  ArrowLeft, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Ban,
  RefreshCw,
  Send,
  Download,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OrderStatus } from '@prisma/client';

interface OrderHeaderProps {
  order: {
    id: string;
    paymentReference: string;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      } | null;
    };
    payIn?: {
      id: string;
      status: string;
    } | null;
    payOut?: {
      id: string;
      status: string;
    } | null;
  };
  onAction: (action: string) => void;
  loading?: boolean;
}

export function OrderHeader({ order, onAction, loading = false }: OrderHeaderProps): JSX.Element {
  const userName = order.user.profile 
    ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
    : order.user.email;

  const initials = order.user.profile
    ? `${order.user.profile.firstName[0]}${order.user.profile.lastName[0]}`
    : order.user.email[0].toUpperCase();

  // Determine available actions based on status
  const getAvailableActions = () => {
    const actions = [];

    switch (order.status) {
      case 'PENDING':
        actions.push({ label: 'Mark as Payment Pending', action: 'payment-pending', icon: RefreshCw });
        actions.push({ label: 'Cancel Order', action: 'cancel', icon: XCircle, destructive: true });
        break;
      
      case 'PAYMENT_PENDING':
        actions.push({ label: 'Confirm Payment Received', action: 'payment-received', icon: CheckCircle });
        actions.push({ label: 'Cancel Order', action: 'cancel', icon: XCircle, destructive: true });
        break;
      
      case 'PAYMENT_RECEIVED':
        actions.push({ label: 'Verify & Process', action: 'verify', icon: CheckCircle });
        actions.push({ label: 'Reject Payment', action: 'reject', icon: Ban, destructive: true });
        break;
      
      case 'PROCESSING':
        actions.push({ label: 'Send Crypto', action: 'send-crypto', icon: Send });
        actions.push({ label: 'Refund Payment', action: 'refund', icon: RefreshCw, destructive: true });
        break;
      
      case 'COMPLETED':
        // No actions for completed orders
        break;
      
      case 'CANCELLED':
      case 'FAILED':
      case 'EXPIRED':
        // No actions for terminal statuses
        break;
    }

    // Always available actions
    actions.push({ label: 'Export Order', action: 'export', icon: Download });
    actions.push({ label: 'View User Profile', action: 'view-user', icon: ExternalLink });

    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
      </div>

      {/* Main Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {order.paymentReference}
            </h1>
            <OrderStatusBadge status={order.status} />
            
            {/* PayIn/PayOut Status Badges */}
            {order.payIn && (
              <Badge variant="outline" className="text-xs">
                PayIn: {order.payIn.status}
              </Badge>
            )}
            {order.payOut && (
              <Badge variant="outline" className="text-xs">
                PayOut: {order.payOut.status}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Created {formatDateTime(order.createdAt)}</span>
            <span>•</span>
            <span>Updated {formatDateTime(order.updatedAt)}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={loading}>
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => onAction(action.action)}
                    className={action.destructive ? 'text-destructive' : ''}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{userName}</p>
          <p className="text-sm text-muted-foreground">{order.user.email}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/users/${order.user.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}

