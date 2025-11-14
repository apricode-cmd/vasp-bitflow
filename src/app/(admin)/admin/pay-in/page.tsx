/**
 * Pay In Management Page - Enhanced
 * /admin/pay-in - Manage incoming payments with advanced table
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  FileCheck, 
  ArrowDownCircle, 
  DollarSign, 
  Plus,
  ExternalLink,
  MoreHorizontal,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { QuickStats } from '@/components/admin/QuickStats';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface PayIn {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  currencyType: string;
  paymentMethodCode: string;
  status: string;
  expectedAmount: number;
  receivedAmount: number | null;
  amountMismatch: boolean;
  senderName: string | null;
  transactionId: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  paymentDate: string | null;
  createdAt: string;
  order: {
    id: string;
    paymentReference: string;
    cryptoAmount: number;
    currencyCode: string;
  };
  user: {
    id: string;
    email: string;
  };
  fiatCurrency: {
    code: string;
    name: string;
    symbol: string;
  } | null;
  cryptocurrency: {
    code: string;
    name: string;
    symbol: string;
  } | null;
  paymentMethod: {
    code: string;
    name: string;
  } | null;
  network: {
    code: string;
    name: string;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  RECEIVED: { label: 'Received', variant: 'default' },
  VERIFIED: { label: 'Verified', variant: 'default' },
  PARTIAL: { label: 'Partial', variant: 'outline' },
  MISMATCH: { label: 'Mismatch', variant: 'destructive' },
  RECONCILED: { label: 'Reconciled', variant: 'default' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  REFUNDED: { label: 'Refunded', variant: 'outline' },
  EXPIRED: { label: 'Expired', variant: 'secondary' }
};

export default function PayInPage(): JSX.Element {
  const router = useRouter();
  const [payIns, setPayIns] = useState<PayIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchPayIns();
    fetchStats();
  }, [filters.status]);

  const fetchPayIns = async (): Promise<void> => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/admin/pay-in?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayIns(data.data);
      } else {
        toast.error('Failed to load payments');
      }
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/pay-in/stats');
      const data = await response.json();

      if (data.success) {
        // Transform stats to QuickStats format
        setQuickStats([
          {
            label: 'Total Payments',
            value: data.data.total.toString(),
            icon: <Receipt className="h-4 w-4" />,
            trend: {
              value: data.data.recentCount,
              label: 'today'
            },
            color: 'default' as const,
          },
          {
            label: 'Pending Review',
            value: (data.data.pending + data.data.received).toString(),
            icon: <Clock className="h-4 w-4" />,
            trend: {
              value: data.data.pending > 0 ? data.data.pending : 0,
              label: 'needs attention'
            },
            color: data.data.pending > 0 ? 'warning' as const : 'default' as const,
          },
          {
            label: 'Verified',
            value: data.data.verified.toString(),
            icon: <CheckCircle className="h-4 w-4" />,
            trend: {
              value: data.data.successRate,
              label: 'success rate'
            },
            color: 'success' as const,
          },
          {
            label: 'Issues',
            value: (data.data.failed + data.data.amountMismatches).toString(),
            icon: <AlertTriangle className="h-4 w-4" />,
            trend: {
              value: data.data.amountMismatches,
              label: 'mismatches'
            },
            color: (data.data.failed + data.data.amountMismatches) > 0 ? 'danger' as const : 'default' as const,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const updateStatus = async (id: string, newStatus: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/pay-in/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment status updated');
        await fetchPayIns();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Define table columns
  const columns: ColumnDef<PayIn>[] = [
    {
      id: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-sm font-medium">
            {row.original.order.paymentReference}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.user.email}
          </div>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const payIn = row.original;
        const symbol = payIn.fiatCurrency?.symbol || payIn.cryptocurrency?.symbol || '';
        return (
          <div>
            <div className="font-medium">
              {symbol}{payIn.amount.toFixed(2)}
            </div>
            {payIn.receivedAmount && payIn.receivedAmount !== payIn.expectedAmount && (
              <div className="text-xs text-red-500">
                Received: {symbol}{payIn.receivedAmount.toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.currency}
        </Badge>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.currencyType === 'FIAT' 
            ? (row.original.paymentMethod?.name || 'N/A')
            : (row.original.network?.name || 'N/A')
          }
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const payIn = row.original;
        const config = statusConfig[payIn.status] || statusConfig.PENDING;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={config.variant}>
              {config.label}
            </Badge>
            {payIn.amountMismatch && (
              <Badge variant="destructive" className="text-xs">
                Mismatch
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const payIn = row.original;
        const date = payIn.paymentDate || payIn.createdAt;
        return (
          <div className="text-sm text-muted-foreground">
            {format(new Date(date), 'MMM dd, yyyy HH:mm')}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const payIn = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/pay-in/${payIn.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                
                {payIn.status === 'RECEIVED' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      updateStatus(payIn.id, 'VERIFIED');
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Payment
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(payIn.id, 'FAILED');
                      }}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark Failed
                    </DropdownMenuItem>
                  </>
                )}
                
                {payIn.status === 'VERIFIED' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      updateStatus(payIn.id, 'RECONCILED');
                    }}>
                      <FileCheck className="h-4 w-4 mr-2" />
                      Mark Reconciled
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders/${payIn.orderId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Order
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${payIn.userId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View User
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pay In Management</h1>
          <p className="text-muted-foreground">Manage incoming payments from customers</p>
        </div>
        <Button onClick={() => router.push('/admin/pay-in/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create PayIn
        </Button>
      </div>

      {/* Quick Stats */}
      {quickStats && <QuickStats stats={quickStats} />}

      {/* Data Table */}
      <DataTableAdvanced
        columns={columns}
        data={payIns}
        searchPlaceholder="Search by reference, email, or transaction ID..."
        isLoading={loading}
        onRowClick={(row) => router.push(`/admin/pay-in/${row.id}`)}
        pageSize={20}
        exportFilename="pay-in-transactions"
        enableRowSelection={true}
        bulkActions={[
          {
            label: 'Mark as Verified',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: async (selectedRows: PayIn[]) => {
              const receivedRows = selectedRows.filter(r => r.status === 'RECEIVED');
              if (receivedRows.length === 0) {
                toast.error('No RECEIVED payments selected');
                return;
              }
              
              for (const row of receivedRows) {
                await updateStatus(row.id, 'VERIFIED');
              }
              toast.success(`Verified ${receivedRows.length} payment(s)`);
            },
            variant: 'default',
          },
          {
            label: 'Mark as Reconciled',
            icon: <FileCheck className="h-4 w-4" />,
            onClick: async (selectedRows: PayIn[]) => {
              const verifiedRows = selectedRows.filter(r => r.status === 'VERIFIED');
              if (verifiedRows.length === 0) {
                toast.error('No VERIFIED payments selected');
                return;
              }
              
              for (const row of verifiedRows) {
                await updateStatus(row.id, 'RECONCILED');
              }
              toast.success(`Reconciled ${verifiedRows.length} payment(s)`);
            },
            variant: 'outline',
          },
        ]}
      />
    </div>
  );
}
