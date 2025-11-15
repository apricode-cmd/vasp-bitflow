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
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Ban,
  RefreshCw,
  Send,
  Download,
  ExternalLink,
  Copy,
  Clock,
  Home,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
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
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      } | null;
      kycSession?: {
        status: string;
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
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  const userName = order.user.profile 
    ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
    : order.user.email;

  const initials = order.user.profile
    ? `${order.user.profile.firstName[0]}${order.user.profile.lastName[0]}`
    : order.user.email[0].toUpperCase();

  // Calculate time remaining until expiration
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(order.expiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpiringSoon(false);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      // Mark as expiring soon if less than 24 hours
      setIsExpiringSoon(difference < 24 * 60 * 60 * 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [order.expiresAt]);

  const copyPaymentReference = () => {
    navigator.clipboard.writeText(order.paymentReference);
    toast.success('Payment reference copied to clipboard');
  };

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
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/orders" className="hover:text-foreground transition-colors">
          Orders
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{order.paymentReference}</span>
      </div>

      {/* Main Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          {/* Title Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              Order #{order.paymentReference}
            </h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyPaymentReference}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <OrderStatusBadge status={order.status} className="text-sm px-3 py-1" />
            
            {/* PayIn Status */}
            {order.payIn && (
              <Badge variant="outline" className="gap-1.5">
                <TrendingDown className="h-3 w-3" />
                PayIn: {order.payIn.status}
              </Badge>
            )}
            
            {/* PayOut Status */}
            {order.payOut && (
              <Badge variant="outline" className="gap-1.5">
                <TrendingUp className="h-3 w-3" />
                PayOut: {order.payOut.status}
              </Badge>
            )}

            {/* KYC Status */}
            {order.user.kycSession && (
              <Badge 
                variant={order.user.kycSession.status === 'APPROVED' ? 'default' : 'secondary'}
                className="gap-1.5"
              >
                KYC: {order.user.kycSession.status}
              </Badge>
            )}

            {/* Expiration Timer */}
            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'EXPIRED' && (
              <Badge 
                variant={isExpiringSoon ? 'destructive' : 'secondary'}
                className="gap-1.5"
              >
                <Clock className="h-3 w-3" />
                {timeLeft}
              </Badge>
            )}
          </div>
          
          {/* Timestamps */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Created {formatDateTime(order.createdAt)}</span>
            <span>•</span>
            <span>Updated {formatDateTime(order.updatedAt)}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => onAction('view-user')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            User Profile
          </Button>

          {availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" disabled={loading}>
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

      {/* Warning Alert for Expiring Soon */}
      {isExpiringSoon && order.status === 'PENDING' && (
        <div className="flex items-start gap-3 p-4 border border-orange-200 rounded-lg bg-orange-50">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-orange-900">Order Expiring Soon</p>
            <p className="text-sm text-orange-700 mt-1">
              This order will expire in {timeLeft}. Please ensure payment is received before expiration.
            </p>
          </div>
        </div>
      )}

      {/* User Info Card */}
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{userName}</p>
          <p className="text-sm text-muted-foreground truncate">{order.user.email}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/users/${order.user.id}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

