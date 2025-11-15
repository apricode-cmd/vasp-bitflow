/**
 * OrderCard Component
 * 
 * Compact order card for Kanban view
 * Memoized for performance in lists
 * 
 * Features:
 * - Minimal, essential information
 * - Fast rendering
 * - Click to navigate
 * - Visual status indicators
 */

'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { formatDistanceToNow } from 'date-fns';
import { TrendingDown, TrendingUp, Clock } from 'lucide-react';
import type { Order } from '../_lib/useOrders';

interface OrderCardProps {
  order: Order;
}

export const OrderCard = memo(function OrderCard({ order }: OrderCardProps) {
  const router = useRouter();

  const userName = order.user.profile
    ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
    : order.user.email;

  const userInitials = order.user.profile
    ? `${order.user.profile.firstName[0]}${order.user.profile.lastName[0]}`
    : order.user.email[0].toUpperCase();

  // Check if expiring soon (< 24h)
  const expiresAt = new Date(order.expiresAt);
  const now = new Date();
  const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isExpiringSoon = hoursUntilExpiry > 0 && hoursUntilExpiry < 24;

  const handleClick = () => {
    router.push(`/admin/orders/${order.id}`);
  };

  return (
    <Card 
      className="mb-3 cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
      onClick={handleClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Reference & Currency */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-medium text-muted-foreground">
            #{order.paymentReference}
          </span>
          <Badge variant="outline" className="text-xs">
            {order.currencyCode}
          </Badge>
        </div>

        {/* Amount */}
        <div>
          <p className="text-xl font-bold">
            {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCryptoAmount(order.cryptoAmount)} {order.currencyCode}
          </p>
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm truncate flex-1">{userName}</span>
        </div>

        {/* Status Indicators (PayIn/PayOut) */}
        {(order.payIn || order.payOut) && (
          <div className="flex flex-wrap gap-1.5">
            {order.payIn && (
              <Badge variant="outline" className="text-xs gap-1">
                <TrendingDown className="h-3 w-3" />
                {order.payIn.status}
              </Badge>
            )}
            {order.payOut && (
              <Badge variant="outline" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" />
                {order.payOut.status}
              </Badge>
            )}
          </div>
        )}

        {/* Expiry Warning */}
        {isExpiringSoon && order.status === 'PENDING' && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600">
            <Clock className="h-3 w-3" />
            <span>Expires soon</span>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
});

