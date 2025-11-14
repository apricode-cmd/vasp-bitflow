/**
 * PayOutTab Component
 * 
 * Displays user's outgoing crypto payments (Pay-Out) with:
 * - Status badges (PENDING, PROCESSING, SENT, CONFIRMED, FAILED)
 * - Amount, currency, blockchain
 * - Transaction hash (if available)
 */

'use client';

import { useState, useEffect } from 'react';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import { ArrowUpDown, Eye, ArrowUpCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PayOut {
  id: string;
  amount: number;
  cryptocurrencyCode: string;
  destinationAddress: string;
  status: string;
  transactionHash: string | null;
  createdAt: string;
  processedAt: string | null;
  confirmedAt: string | null;
  networkCode: string;
  order: {
    id: string;
    paymentReference: string;
  } | null;
}

interface PayOutTabProps {
  userId: string;
}

export function PayOutTab({ userId }: PayOutTabProps): JSX.Element {
  const [payOuts, setPayOuts] = useState<PayOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayOuts();
  }, [userId]);

  const fetchPayOuts = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/pay-out`);
      const data = await response.json();

      if (data.success) {
        setPayOuts(data.data);
      } else {
        toast.error('Failed to fetch pay-out data');
      }
    } catch (error) {
      console.error('Fetch pay-out error:', error);
      toast.error('Failed to fetch pay-out data');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<PayOut>[] = [
    {
      accessorKey: 'order.paymentReference',
      header: 'Order Reference',
      cell: ({ row }) => {
        const payOut = row.original;
        if (!payOut.order) return <span className="text-muted-foreground">-</span>;
        return (
          <Link href={`/admin/orders?id=${payOut.order.id}`}>
            <span className="font-mono text-sm hover:underline">
              {payOut.order.paymentReference}
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
        const payOut = row.original;
        return (
          <span className="font-semibold text-red-600 dark:text-red-400">
            {payOut.amount} {payOut.cryptocurrencyCode}
          </span>
        );
      },
    },
    {
      accessorKey: 'destinationAddress',
      header: 'Wallet Address',
      cell: ({ row }) => {
        const address = row.original.destinationAddress;
        const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
        return (
          <span className="font-mono text-xs" title={address}>
            {short}
          </span>
        );
      },
    },
    {
      accessorKey: 'networkCode',
      header: 'Network',
      cell: ({ row }) => {
        const network = row.original.networkCode;
        return <Badge variant="outline">{network}</Badge>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, any> = {
          PENDING: 'warning',
          PROCESSING: 'default',
          SENT: 'secondary',
          CONFIRMED: 'success',
          FAILED: 'destructive',
          CANCELLED: 'outline',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'transactionHash',
      header: 'TX Hash',
      cell: ({ row }) => {
        const payOut = row.original;
        if (!payOut.transactionHash) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }
        const short = `${payOut.transactionHash.slice(0, 6)}...${payOut.transactionHash.slice(-4)}`;
        // TODO: Add blockchain explorer URL mapping
        return (
          <span className="font-mono text-xs" title={payOut.transactionHash}>
            {short}
          </span>
        );
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
        const payOut = row.original;
        return (
          <Link href={`/admin/pay-out?id=${payOut.id}`}>
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
      {payOuts.length === 0 && !loading ? (
        <div className="text-center py-12">
          <ArrowUpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No outgoing payments yet</p>
        </div>
      ) : (
        <DataTableAdvanced
          columns={columns}
          data={payOuts}
          isLoading={loading}
          pageSize={10}
          enableExport={true}
          exportFileName={`user-${userId}-pay-out`}
        />
      )}
    </div>
  );
}
