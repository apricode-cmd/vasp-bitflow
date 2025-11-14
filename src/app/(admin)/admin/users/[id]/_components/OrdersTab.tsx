/**
 * OrdersTab Component
 * 
 * Displays user's orders in DataTableAdvanced with:
 * - Sorting, filtering, pagination
 * - Export functionality
 * - Quick actions (view details)
 */

'use client';

import { useState, useEffect } from 'react';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { formatDateTime } from '@/lib/formatters';
import { ArrowUpDown, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Order {
  id: string;
  paymentReference: string;
  cryptoAmount: number;
  totalFiat: number;
  status: string;
  createdAt: string;
  currency: { code: string; name: string };
  fiatCurrency: { code: string };
}

interface OrdersTabProps {
  userId: string;
}

export function OrdersTab({ userId }: OrdersTabProps): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/orders`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'paymentReference',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Reference
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Link href={`/admin/orders?id=${order.id}`}>
            <span className="font-mono text-sm hover:underline">
              {order.paymentReference}
            </span>
          </Link>
        );
      },
    },
    {
      accessorKey: 'currency.code',
      header: 'Currency',
      cell: ({ row }) => {
        const currency = row.original.currency;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{currency.code}</Badge>
            <span className="text-xs text-muted-foreground">{currency.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'cryptoAmount',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const order = row.original;
        return (
          <span className="font-medium">
            {order.cryptoAmount} {order.currency.code}
          </span>
        );
      },
    },
    {
      accessorKey: 'totalFiat',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const order = row.original;
        return (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(order.totalFiat, order.fiatCurrency.code)}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, any> = {
          COMPLETED: 'success',
          PENDING: 'warning',
          PROCESSING: 'default',
          PAYMENT_PENDING: 'secondary',
          CANCELLED: 'destructive',
          FAILED: 'destructive',
          EXPIRED: 'outline',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(new Date(row.original.createdAt))}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Link href={`/admin/orders?id=${order.id}`} scroll={false}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableAdvanced
        columns={columns}
        data={orders}
        isLoading={loading}
        searchKey="paymentReference"
        searchPlaceholder="Search by reference..."
        pageSize={10}
        enableExport={true}
        exportFileName={`user-${userId}-orders`}
      />
    </div>
  );
}

