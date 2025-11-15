/**
 * Order Table Columns
 * 
 * Reusable column definitions for OrdersTableView
 * Using DataTableAdvanced standards
 */

'use client';

import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { formatDateTime, formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Order } from './useOrders';
import type { OrderStatus } from '@prisma/client';

// Status transition rules
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAYMENT_PENDING', 'PROCESSING', 'CANCELLED'],
  PAYMENT_PENDING: ['PROCESSING', 'CANCELLED'],
  PAYMENT_RECEIVED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
  EXPIRED: ['PENDING'],
  FAILED: ['PENDING', 'CANCELLED'],
};

interface UseOrderColumnsProps {
  onStatusChange?: (orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus) => void;
}

export function useOrderColumns({ onStatusChange }: UseOrderColumnsProps = {}): ColumnDef<Order>[] {
  return useMemo<ColumnDef<Order>[]>(() => [
    // Selection column
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // Customer
    {
      accessorKey: 'user.email',
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const user = row.original.user;
        const name = user.profile 
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : user.email;
        const initials = user.profile
          ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`
          : user.email[0].toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        );
      },
    },

    // Payment Reference
    {
      accessorKey: 'paymentReference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {row.original.paymentReference}
        </span>
      ),
    },

    // Status - Editable with transition validation (like PayIn)
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row, table }) => {
        const order = row.original;
        const allowedStatuses = STATUS_TRANSITIONS[order.status as OrderStatus] || [];
        
        // If no transitions allowed, show static badge
        if (allowedStatuses.length === 0) {
          return <OrderStatusBadge status={order.status} />;
        }

        const handleValueChange = (newValue: string) => {
          const newStatus = newValue as OrderStatus;
          if (newStatus !== order.status) {
            onStatusChange?.(order.id, order.status, newStatus);
          }
        };

        return (
          <div 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click
            }}
          >
            <Select value={order.status} onValueChange={handleValueChange}>
              <SelectTrigger
                className="h-8 w-auto border-0 bg-transparent p-0 focus:ring-0 [&>span]:hidden hover:opacity-80 transition-opacity"
                aria-label="select-status"
                onClick={(e) => e.stopPropagation()}
              >
                <OrderStatusBadge status={order.status} />
              </SelectTrigger>
              <SelectContent>
                {/* Current status (for display only) */}
                <SelectItem value={order.status} disabled>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-xs text-muted-foreground">(current)</span>
                  </div>
                </SelectItem>
                
                {/* Allowed transitions */}
                {allowedStatuses.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t">
                      Available transitions:
                    </div>
                    {allowedStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        <OrderStatusBadge status={status} />
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },

    // Crypto Amount
    {
      id: 'cryptoAmount',
      accessorFn: (row) => row.cryptoAmount,
      header: 'Crypto Amount',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {formatCryptoAmount(row.original.cryptoAmount)} {row.original.currencyCode}
          </p>
        </div>
      ),
    },

    // Fiat Amount
    {
      id: 'totalFiat',
      accessorFn: (row) => row.totalFiat,
      header: 'Total Amount',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">
            {formatCurrency(row.original.totalFiat, row.original.fiatCurrencyCode)}
          </p>
          <p className="text-xs text-muted-foreground">
            Rate: {formatCurrency(row.original.rate, row.original.fiatCurrencyCode)}
          </p>
        </div>
      ),
    },

    // PayIn/PayOut Status
    {
      id: 'flow',
      header: 'Flow',
      cell: ({ row }) => {
        const { payIn, payOut } = row.original;
        
        return (
          <div className="flex flex-col gap-1">
            {payIn && (
              <Badge variant="outline" className="text-xs gap-1 w-fit">
                <TrendingDown className="h-3 w-3" />
                {payIn.status}
              </Badge>
            )}
            {payOut && (
              <Badge variant="outline" className="text-xs gap-1 w-fit">
                <TrendingUp className="h-3 w-3" />
                {payOut.status}
              </Badge>
            )}
            {!payIn && !payOut && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },

    // Created Date
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDateTime(row.original.createdAt)}
        </div>
      ),
    },

  ], [onStatusChange]);
}

