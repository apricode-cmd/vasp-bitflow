/**
 * PayInTab Component
 * 
 * Displays user's incoming fiat payments (Pay-In) with:
 * - Status badges (RECEIVED, VERIFIED, FAILED)
 * - Amount, currency, payment method
 * - Verification info
 */

'use client';

import { useState, useEffect } from 'react';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { formatDateTime } from '@/lib/formatters';
import { ArrowUpDown, Eye, ArrowDownCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PayIn {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  verifiedAt: string | null;
  fiatCurrency: { code: string };
  order: {
    id: string;
    paymentReference: string;
  } | null;
  paymentMethod: {
    name: string;
    type: string;
  } | null;
}

interface PayInTabProps {
  userId: string;
}

export function PayInTab({ userId }: PayInTabProps): JSX.Element {
  const [payIns, setPayIns] = useState<PayIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayIns();
  }, [userId]);

  const fetchPayIns = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/pay-in`);
      const data = await response.json();

      if (data.success) {
        setPayIns(data.data);
      } else {
        toast.error('Failed to fetch pay-in data');
      }
    } catch (error) {
      console.error('Fetch pay-in error:', error);
      toast.error('Failed to fetch pay-in data');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<PayIn>[] = [
    {
      accessorKey: 'order.paymentReference',
      header: 'Order Reference',
      cell: ({ row }) => {
        const payIn = row.original;
        if (!payIn.order) return <span className="text-muted-foreground">-</span>;
        return (
          <Link href={`/admin/orders?id=${payIn.order.id}`}>
            <span className="font-mono text-sm hover:underline">
              {payIn.order.paymentReference}
            </span>
          </Link>
        );
      },
    },
    {
      accessorKey: 'amount',
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
        const payIn = row.original;
        return (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(payIn.amount, payIn.fiatCurrency.code)}
          </span>
        );
      },
    },
    {
      accessorKey: 'paymentMethod.name',
      header: 'Payment Method',
      cell: ({ row }) => {
        const method = row.original.paymentMethod;
        if (!method) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{method.name}</span>
            <span className="text-xs text-muted-foreground">{method.type}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, any> = {
          RECEIVED: 'warning',
          VERIFIED: 'success',
          FAILED: 'destructive',
          REFUNDED: 'secondary',
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
      accessorKey: 'verifiedAt',
      header: 'Verified',
      cell: ({ row }) => {
        const verifiedAt = row.original.verifiedAt;
        if (!verifiedAt) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-sm text-green-600 dark:text-green-400">
            {formatDateTime(new Date(verifiedAt))}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const payIn = row.original;
        return (
          <Link href={`/admin/pay-in?id=${payIn.id}`}>
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
      {payIns.length === 0 && !loading ? (
        <div className="text-center py-12">
          <ArrowDownCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No incoming payments yet</p>
        </div>
      ) : (
        <DataTableAdvanced
          columns={columns}
          data={payIns}
          isLoading={loading}
          pageSize={10}
          enableExport={true}
          exportFileName={`user-${userId}-pay-in`}
        />
      )}
    </div>
  );
}

