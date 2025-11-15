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
  ExternalLink,
  MoreHorizontal,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { QuickStats } from '@/components/admin/QuickStats';
import { CreatePayInSheet } from './_components/CreatePayInSheet';
import { EditableTextCell, createEditableSelectCell } from '@/components/admin/EditableCells';
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
  fiatCurrencyCode: string | null;
  cryptocurrencyCode: string | null;
  currencyType: string;
  paymentMethodCode: string | null;
  networkCode: string | null;
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
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'default',
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

  // Create editable status cell with colored badges
  const EditableStatusCell = ({ getValue, row, column: { id }, table }: any) => {
    const initialValue = getValue() as string;
    const payIn = row.original;
    const config = statusConfig[initialValue] || statusConfig.PENDING;

    const handleValueChange = (newValue: string) => {
      table.options.meta?.updateData?.(row.index, id, newValue);
    };

    return (
      <div className="flex items-center gap-2">
        <Select value={initialValue} onValueChange={handleValueChange}>
          <SelectTrigger
            className="h-8 w-auto border-0 bg-transparent p-0 focus:ring-0 [&>span]:hidden"
            aria-label="select-status"
          >
            <Badge variant={config.variant} className="cursor-pointer">
              {config.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">
              <Badge variant={statusConfig.PENDING.variant}>Pending</Badge>
            </SelectItem>
            <SelectItem value="RECEIVED">
              <Badge variant={statusConfig.RECEIVED.variant}>Received</Badge>
            </SelectItem>
            <SelectItem value="VERIFIED">
              <Badge variant={statusConfig.VERIFIED.variant}>Verified</Badge>
            </SelectItem>
            <SelectItem value="PARTIAL">
              <Badge variant={statusConfig.PARTIAL.variant}>Partial</Badge>
            </SelectItem>
            <SelectItem value="MISMATCH">
              <Badge variant={statusConfig.MISMATCH.variant}>Mismatch</Badge>
            </SelectItem>
            <SelectItem value="RECONCILED">
              <Badge variant={statusConfig.RECONCILED.variant}>Reconciled</Badge>
            </SelectItem>
            <SelectItem value="FAILED">
              <Badge variant={statusConfig.FAILED.variant}>Failed</Badge>
            </SelectItem>
            <SelectItem value="REFUNDED">
              <Badge variant={statusConfig.REFUNDED.variant}>Refunded</Badge>
            </SelectItem>
            <SelectItem value="EXPIRED">
              <Badge variant={statusConfig.EXPIRED.variant}>Expired</Badge>
            </SelectItem>
          </SelectContent>
        </Select>
        {payIn.amountMismatch && (
          <Badge variant="destructive" className="text-xs">
            Mismatch
          </Badge>
        )}
      </div>
    );
  };

  // Define table columns
  const columns: ColumnDef<PayIn>[] = [
    // Row selection checkbox
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
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      cell: ({ row }) => {
        const payIn = row.original;
        const currencyCode = payIn.currencyType === 'FIAT' 
          ? payIn.fiatCurrencyCode 
          : payIn.cryptocurrencyCode;
        
        return (
          <Badge variant="outline" className="font-mono">
            {currencyCode || 'N/A'}
          </Badge>
        );
      },
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
      cell: EditableStatusCell, // Now editable!
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
        <CreatePayInSheet 
          onSuccess={async () => {
            await fetchPayIns();
            await fetchStats();
          }} 
        />
      </div>

      {/* Quick Stats */}
      {quickStats && <QuickStats stats={quickStats} />}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
              className={confirmDialog.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Data Table */}
      <DataTableAdvanced
        columns={columns}
        data={payIns}
        searchPlaceholder="Search by reference, email, or transaction ID..."
        isLoading={loading}
        onRowClick={(row) => router.push(`/admin/pay-in/${row.id}`)}
        pageSize={20}
        exportFilename="pay-in-transactions"
        enableExport={true}
        enableRowSelection={true}
        onDataUpdate={async (rowIndex, columnId, value) => {
          const payIn = payIns[rowIndex];
          if (!payIn) return;

          try {
            const response = await fetch(`/api/admin/pay-in/${payIn.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [columnId]: value }),
            });

            if (!response.ok) {
              toast.error(`Failed to update ${columnId}`);
              return;
            }

            // Update local state optimistically
            setPayIns(prev => prev.map((item, idx) => 
              idx === rowIndex ? { ...item, [columnId]: value } : item
            ));

            toast.success('Updated successfully');
            await fetchStats();
          } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to save changes');
            // Refresh to revert changes
            await fetchPayIns();
          }
        }}
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
                      
                      setConfirmDialog({
                        open: true,
                        title: 'Verify Payments',
                        description: `Are you sure you want to mark ${receivedRows.length} payment(s) as VERIFIED? This confirms the payment has been received and amount matches.`,
                        variant: 'default',
                        onConfirm: async () => {
                          for (const row of receivedRows) {
                            await updateStatus(row.id, 'VERIFIED');
                          }
                          toast.success(`Verified ${receivedRows.length} payment(s)`);
                          await fetchPayIns();
                          await fetchStats();
                        },
                      });
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
                      
                      setConfirmDialog({
                        open: true,
                        title: 'Reconcile Payments',
                        description: `Are you sure you want to mark ${verifiedRows.length} payment(s) as RECONCILED? This finalizes the accounting for these transactions.`,
                        variant: 'default',
                        onConfirm: async () => {
                          for (const row of verifiedRows) {
                            await updateStatus(row.id, 'RECONCILED');
                          }
                          toast.success(`Reconciled ${verifiedRows.length} payment(s)`);
                          await fetchPayIns();
                          await fetchStats();
                        },
                      });
                    },
                    variant: 'outline',
                  },
                  {
                    label: 'Refund Payments',
                    icon: <RotateCcw className="h-4 w-4" />,
                    onClick: async (selectedRows: PayIn[]) => {
                      const refundableRows = selectedRows.filter(r => 
                        r.status === 'RECEIVED' || r.status === 'VERIFIED'
                      );
                      
                      if (refundableRows.length === 0) {
                        toast.error('No refundable payments selected (must be RECEIVED or VERIFIED)');
                        return;
                      }
                      
                      setConfirmDialog({
                        open: true,
                        title: 'Refund Payments',
                        description: `Are you sure you want to refund ${refundableRows.length} payment(s)? This action will initiate the refund process. Make sure you have already processed the bank refund before marking it here.`,
                        variant: 'destructive',
                        onConfirm: async () => {
                          let successCount = 0;
                          for (const row of refundableRows) {
                            try {
                              await updateStatus(row.id, 'REFUNDED');
                              successCount++;
                            } catch (error) {
                              console.error(`Failed to refund ${row.id}:`, error);
                            }
                          }
                          
                          if (successCount > 0) {
                            toast.success(`Refunded ${successCount} payment(s)`);
                            await fetchPayIns();
                            await fetchStats();
                          }
                        },
                      });
                    },
                    variant: 'destructive',
                  },
                ]}
      />
    </div>
  );
}
