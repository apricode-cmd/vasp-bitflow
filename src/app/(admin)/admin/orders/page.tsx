/**
 * Admin Orders Management Page
 * 
 * Unified orders management with switchable views: Kanban (default) and Table
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/admin/DataTable';
import { OrderKanban } from '@/components/admin/OrderKanban';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import { OrderDetailsSheet } from '@/components/admin/OrderDetailsSheet';
import { CreateOrderDialog } from '@/components/admin/CreateOrderDialog';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { QuickNav } from '@/components/crm/QuickNav';
import { formatDateTime, formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';
import type { OrderStatus } from '@prisma/client';
import { 
  MoreHorizontal, Eye, Ban, CheckCircle, 
  RefreshCw, LayoutGrid, List, Users, Coins, Download
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

interface Order {
  id: string;
  cryptoAmount: number;
  currencyCode: string;
  fiatCurrencyCode: string;
  totalFiat: number;
  status: OrderStatus;
  paymentReference: string;
  createdAt: Date;
  walletAddress: string;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string; } | null;
  };
}

type ViewMode = 'kanban' | 'table';

export default function AdminOrdersPage(): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  // Reference data for OrderTransitionDialog
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<any[]>([]);
  const [cryptocurrencies, setCryptocurrencies] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchReferenceData();
    
    // Check if order ID is in URL params
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (orderId && orders.length > 0) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        viewOrderDetails(order);
      }
    }
  }, [selectedStatus, dateRange]);
  
  // Handle opening order from URL on initial load
  useEffect(() => {
    if (orders.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        viewOrderDetails(order);
      }
    }
  }, [orders]);

  const fetchOrders = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (dateRange?.from) {
        params.append('from', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('to', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();

      if (data.orders) {
        setOrders(data.orders.map((o: any) => ({
          ...o,
          createdAt: new Date(o.createdAt)
        })));
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReferenceData = async (): Promise<void> => {
    try {
      const [methodsRes, fiatRes, cryptoRes, networksRes] = await Promise.all([
        fetch('/api/admin/payment-methods'),
        fetch('/api/admin/resources/fiat-currencies'),
        fetch('/api/admin/resources/currencies?active=true'),
        fetch('/api/admin/blockchains')
      ]);

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.methods || data.data || []);
      }
      if (fiatRes.ok) {
        const data = await fiatRes.json();
        setFiatCurrencies(data.data || []);
      }
      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        setCryptocurrencies(data.data || []);
      }
      if (networksRes.ok) {
        const data = await networksRes.json();
        setNetworks(data.networks || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
      // Don't show error to user, reference data is not critical
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus, transitionData?: any): Promise<void> => {
    try {
      const payload = transitionData || { status: newStatus };
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Order status updated');
        await fetchOrders();
        setSheetOpen(false);
      } else {
        // Check if API requires additional data
        if (data.requiresPayIn || data.requiresPayOut) {
          toast.error(data.message || 'Additional information required');
        } else {
          toast.error(data.error || 'Failed to update order');
        }
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('An error occurred');
    }
  };

  const handleCancelOrder = async (): Promise<void> => {
    if (!orderToDelete) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderToDelete}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });

      if (response.ok) {
        toast.success('Order cancelled successfully');
        await fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('An error occurred');
    } finally {
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const openCancelDialog = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const viewOrderDetails = (order: Order) => {
    // Navigate to dedicated order details page instead of opening sheet
    window.location.href = `/admin/orders/${order.id}`;
  };

  // Filter orders for table view
  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  // Define table columns
  const columns: ColumnDef<Order>[] = [
    {
      id: 'customer', // Changed from accessorKey to id
      header: 'Customer',
      accessorFn: (row) => row.user.email, // For searching/filtering
      cell: ({ row }) => {
        const user = row.original.user;
        const initials = `${user.profile?.firstName?.charAt(0) || ''}${user.profile?.lastName?.charAt(0) || ''}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">
                {user.profile?.firstName} {user.profile?.lastName}
              </div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'paymentReference',
      header: 'Reference',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.paymentReference}
        </Badge>
      ),
    },
    {
      accessorKey: 'currencyCode',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {row.original.currencyCode}
            </Badge>
            <span className="text-sm font-medium">
              {formatCryptoAmount(row.original.cryptoAmount, row.original.currencyCode)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'totalFiat',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.totalFiat, row.original.fiatCurrencyCode)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${order.user.id}`}>
                    <Users className="h-4 w-4 mr-2" />
                    View Customer
                  </Link>
                </DropdownMenuItem>
                {order.status !== 'CANCELLED' && (
                  <DropdownMenuItem asChild>
                    <a href={`/api/admin/orders/${order.id}/invoice`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {order.status === 'PENDING' && (
                  <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'PROCESSING')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Processing
                  </DropdownMenuItem>
                )}
                {order.status === 'PROCESSING' && (
                  <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </DropdownMenuItem>
                )}
                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => openCancelDialog(order.id)}
                      className="text-destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Order
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all cryptocurrency orders
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Create Order - Make it prominent */}
          <CreateOrderDialog onSuccess={fetchOrders} />

          <Separator orientation="vertical" className="hidden sm:block h-8" />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="flex-1 sm:flex-none"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex-1 sm:flex-none"
            >
              <List className="h-4 w-4 mr-2" />
              Table
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchOrders}
            disabled={refreshing}
            className="self-end sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters - only show for table view */}
      {viewMode === 'table' && (
        <Card>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="PENDING">Pending</TabsTrigger>
                    <TabsTrigger value="PROCESSING">Processing</TabsTrigger>
                    <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
                    <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="w-full md:w-auto">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  placeholder="Filter by date range"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <OrderKanban
          orders={orders.map(o => ({
            ...o,
            createdAt: o.createdAt.toISOString()
          }))}
          onStatusChange={handleStatusUpdate}
          onOrderClick={viewOrderDetails}
          paymentMethods={paymentMethods}
          fiatCurrencies={fiatCurrencies}
          cryptocurrencies={cryptocurrencies}
          networks={networks}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          searchKey="paymentReference"
          searchPlaceholder="Search by reference or email..."
          isLoading={loading}
          onRowClick={viewOrderDetails}
          pageSize={20}
        />
      )}

      {/* Order Details Sheet */}
      <OrderDetailsSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusUpdate={handleStatusUpdate}
        onCancel={(orderId) => {
          setOrderToDelete(orderId);
          setDeleteDialogOpen(true);
          setSheetOpen(false);
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the order and notify the customer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
