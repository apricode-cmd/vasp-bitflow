/**
 * Pay Out Management Page - Enhanced (Like PayIn)
 * /admin/pay-out - Manage outgoing crypto payments with advanced table
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  Loader2,
  ExternalLink,
  MoreHorizontal,
  ArrowUpCircle,
  Ban
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
import { EditableTextCell, createEditableSelectCell } from '@/components/admin/EditableCells';
import { CreatePayOutSheet } from './_components/CreatePayOutSheet';
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

interface PayOut {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currencyType: string;
  fiatCurrencyCode: string | null;
  cryptocurrencyCode: string | null;
  networkCode: string | null;
  paymentMethodCode: string | null;
  status: string;
  destinationAddress: string | null;
  recipientAccount: string | null;
  recipientName: string | null;
  transactionHash: string | null;
  confirmations: number;
  networkFee: number | null;
  processedAt: string | null;
  sentAt: string | null;
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
    symbol: string;
    name: string;
  } | null;
  cryptocurrency: {
    code: string;
    symbol: string;
    name: string;
  } | null;
  network: {
    code: string;
    name: string;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  PENDING: { label: 'Pending', variant: 'secondary' }, // Серый
  QUEUED: { label: 'Queued', variant: 'info' }, // Синий
  PROCESSING: { label: 'Processing', variant: 'info' }, // Синий
  SENT: { label: 'Sent', variant: 'info' }, // Синий
  CONFIRMING: { label: 'Confirming', variant: 'warning' }, // Желтый
  CONFIRMED: { label: 'Confirmed', variant: 'success' }, // Зеленый
  FAILED: { label: 'Failed', variant: 'destructive' }, // Красный
  CANCELLED: { label: 'Cancelled', variant: 'secondary' }, // Серый
  REFUNDED: { label: 'Refunded', variant: 'outline' }, // Белый
};

export default function PayOutPage(): JSX.Element {
  const router = useRouter();
  const [payOuts, setPayOuts] = useState<PayOut[]>([]);
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

  // Create PayOut sheet state
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  useEffect(() => {
    fetchPayOuts();
    fetchStats();
  }, [filters.status]);

  const fetchPayOuts = async (): Promise<void> => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/admin/pay-out?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayOuts(data.data);
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
      const response = await fetch('/api/admin/pay-out/stats');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform stats and add icons
        const statsWithIcons = data.data.stats.map((stat: any) => {
          let icon = null;
          
          switch (stat.label) {
            case 'Pending':
              icon = <Clock className="h-4 w-4" />;
              break;
            case 'In Transit':
              icon = <Send className="h-4 w-4" />;
              break;
            case 'Confirmed':
              icon = <CheckCircle className="h-4 w-4" />;
              break;
            case 'Failed':
              icon = <XCircle className="h-4 w-4" />;
              break;
          }
          
          return {
            ...stat,
            icon,
          };
        });
        
        setQuickStats(statsWithIcons);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const updateStatus = async (id: string, newStatus: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/pay-out/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Create editable status cell with colored badges
  const EditableStatusCell = ({ getValue, row, column: { id }, table }: any) => {
    const initialValue = getValue() as string;
    const payOut = row.original;
    const config = statusConfig[initialValue] || statusConfig.PENDING;

    const handleValueChange = (newValue: string) => {
      table.options.meta?.updateData?.(row.index, id, newValue);
    };

    return (
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
          <SelectItem value="QUEUED">
            <Badge variant={statusConfig.QUEUED.variant}>Queued</Badge>
          </SelectItem>
          <SelectItem value="PROCESSING">
            <Badge variant={statusConfig.PROCESSING.variant}>Processing</Badge>
          </SelectItem>
          <SelectItem value="SENT">
            <Badge variant={statusConfig.SENT.variant}>Sent</Badge>
          </SelectItem>
          <SelectItem value="CONFIRMING">
            <Badge variant={statusConfig.CONFIRMING.variant}>Confirming</Badge>
          </SelectItem>
          <SelectItem value="CONFIRMED">
            <Badge variant={statusConfig.CONFIRMED.variant}>Confirmed</Badge>
          </SelectItem>
          <SelectItem value="FAILED">
            <Badge variant={statusConfig.FAILED.variant}>Failed</Badge>
          </SelectItem>
          <SelectItem value="CANCELLED">
            <Badge variant={statusConfig.CANCELLED.variant}>Cancelled</Badge>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Define table columns
  const columns: ColumnDef<PayOut>[] = [
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
        const payOut = row.original;
        const symbol = payOut.cryptocurrency?.symbol || payOut.fiatCurrency?.symbol || '';
        const code = payOut.cryptocurrencyCode || payOut.fiatCurrencyCode || 'N/A';
        return (
          <div>
            <div className="font-medium">
              {symbol}{payOut.amount.toFixed(8)} {code}
            </div>
            {payOut.networkFee && (
              <div className="text-xs text-muted-foreground">
                Fee: {symbol}{payOut.networkFee.toFixed(8)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'destination',
      header: 'Destination',
      cell: ({ row }) => {
        const payOut = row.original;
        const address = payOut.destinationAddress || payOut.recipientAccount;
        return address ? (
          <div className="font-mono text-xs">
            {address.substring(0, 10)}...{address.substring(address.length - 8)}
          </div>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        );
      },
    },
    {
      id: 'network',
      header: 'Network',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.network?.name || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: EditableStatusCell, // Editable with colors!
    },
    {
      id: 'confirmations',
      header: 'Confirmations',
      cell: ({ row }) => {
        const payOut = row.original;
        if (!payOut.transactionHash) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="text-sm">
            {payOut.confirmations}/12
          </div>
        );
      },
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const payOut = row.original;
        const date = payOut.sentAt || payOut.processedAt || payOut.createdAt;
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
        const payOut = row.original;
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
                  <Link href={`/admin/pay-out/${payOut.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                
                {payOut.transactionHash && payOut.network?.code && (
                  <DropdownMenuItem asChild>
                    <a 
                      href={`https://etherscan.io/tx/${payOut.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pay Out Management</h1>
          <p className="text-muted-foreground">Manage outgoing crypto payments</p>
        </div>
        <Button onClick={() => setCreateSheetOpen(true)}>
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          Create PayOut
        </Button>
      </div>

      {/* Create PayOut Sheet */}
      <CreatePayOutSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        onSuccess={() => {
          fetchPayOuts();
          fetchStats();
        }}
      />

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
        data={payOuts}
        searchPlaceholder="Search by reference, email, or address..."
        isLoading={loading}
        onRowClick={(row) => router.push(`/admin/pay-out/${row.id}`)}
        pageSize={20}
        exportFilename="pay-out-transactions"
        enableExport={true}
        enableRowSelection={true}
        onDataUpdate={async (rowIndex, columnId, value) => {
          const payOut = payOuts[rowIndex];
          if (!payOut) return;

          try {
            const response = await fetch(`/api/admin/pay-out/${payOut.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [columnId]: value }),
            });

            if (!response.ok) {
              toast.error(`Failed to update ${columnId}`);
              return;
            }

            // Update local state optimistically
            setPayOuts(prev => prev.map((item, idx) => 
              idx === rowIndex ? { ...item, [columnId]: value } : item
            ));

            toast.success('Updated successfully');
            await fetchStats();
          } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to save changes');
            // Refresh to revert changes
            await fetchPayOuts();
          }
        }}
        bulkActions={[
          {
            label: 'Mark as Sent',
            icon: <Send className="h-4 w-4" />,
            onClick: async (selectedRows: PayOut[]) => {
              const queuedRows = selectedRows.filter(r => r.status === 'QUEUED' || r.status === 'PROCESSING');
              if (queuedRows.length === 0) {
                toast.error('No queued/processing payments selected');
                return;
              }
              
              setConfirmDialog({
                open: true,
                title: 'Mark as Sent',
                description: `Are you sure you want to mark ${queuedRows.length} payment(s) as SENT?`,
                variant: 'default',
                onConfirm: async () => {
                  for (const row of queuedRows) {
                    await updateStatus(row.id, 'SENT');
                  }
                  toast.success(`Marked ${queuedRows.length} payment(s) as sent`);
                  await fetchPayOuts();
                  await fetchStats();
                },
              });
            },
            variant: 'default',
          },
          {
            label: 'Mark as Confirmed',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: async (selectedRows: PayOut[]) => {
              const sentRows = selectedRows.filter(r => r.status === 'SENT' || r.status === 'CONFIRMING');
              if (sentRows.length === 0) {
                toast.error('No sent/confirming payments selected');
                return;
              }
              
              setConfirmDialog({
                open: true,
                title: 'Confirm Payments',
                description: `Are you sure you want to mark ${sentRows.length} payment(s) as CONFIRMED?`,
                variant: 'default',
                onConfirm: async () => {
                  for (const row of sentRows) {
                    await updateStatus(row.id, 'CONFIRMED');
                  }
                  toast.success(`Confirmed ${sentRows.length} payment(s)`);
                  await fetchPayOuts();
                  await fetchStats();
                },
              });
            },
            variant: 'outline',
          },
          {
            label: 'Mark as Failed',
            icon: <XCircle className="h-4 w-4" />,
            onClick: async (selectedRows: PayOut[]) => {
              setConfirmDialog({
                open: true,
                title: 'Mark as Failed',
                description: `Are you sure you want to mark ${selectedRows.length} payment(s) as FAILED? This should only be done if the transaction has actually failed.`,
                variant: 'destructive',
                onConfirm: async () => {
                  for (const row of selectedRows) {
                    await updateStatus(row.id, 'FAILED');
                  }
                  toast.success(`Marked ${selectedRows.length} payment(s) as failed`);
                  await fetchPayOuts();
                  await fetchStats();
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

