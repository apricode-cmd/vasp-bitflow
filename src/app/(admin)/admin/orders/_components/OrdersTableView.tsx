/**
 * OrdersTableView Component
 * 
 * Table view for orders using DataTableAdvanced
 * Features:
 * - Row selection & bulk actions
 * - Export functionality
 * - Sorting & filtering
 * - Click to navigate to detail page
 * - Inline status editing with OrderTransitionDialog
 * - Consistent with other admin pages (Users, KYC, PayIn, PayOut)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { useOrderColumns } from '../_lib/orderColumns';
import { OrderTransitionDialog } from '@/components/admin/OrderTransitionDialog';
import { toast } from 'sonner';
import type { Order } from '../_lib/useOrders';
import type { OrderStatus } from '@prisma/client';

interface OrdersTableViewProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  paymentMethods?: any[];
  fiatCurrencies?: any[];
  cryptocurrencies?: any[];
  networks?: any[];
}

export function OrdersTableView({ 
  orders, 
  loading, 
  onRefresh,
  paymentMethods = [],
  fiatCurrencies = [],
  cryptocurrencies = [],
  networks = []
}: OrdersTableViewProps): JSX.Element {
  const router = useRouter();
  
  // Transition dialog state
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    order: Order | null;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus | null;
  }>({
    open: false,
    order: null,
    fromStatus: null,
    toStatus: null
  });

  // Handle status change from inline edit
  const handleStatusChange = (orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Check if this transition requires additional data (PayIn/PayOut)
    // PayIn required when payment is received (PAYMENT_RECEIVED)
    const requiresPayIn = newStatus === 'PAYMENT_RECEIVED';
    // PayOut required when sending crypto (COMPLETED)
    const requiresPayOut = newStatus === 'COMPLETED';

    if (requiresPayIn || requiresPayOut) {
      // Show dialog to collect data
      setTransitionDialog({
        open: true,
        order,
        fromStatus: oldStatus,
        toStatus: newStatus
      });
    } else {
      // Simple status change (no additional data needed)
      updateOrderStatus(orderId, newStatus);
    }
  };

  // Handle transition dialog confirmation
  const handleTransitionConfirm = async (data: any): Promise<void> => {
    if (!transitionDialog.order) return;
    
    try {
      const response = await fetch(`/api/admin/orders/${transitionDialog.order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order');
      }

      toast.success('Order status updated successfully');
      
      // Close dialog
      setTransitionDialog({
        open: false,
        order: null,
        fromStatus: null,
        toStatus: null
      });
      
      // Refresh data
      onRefresh();
    } catch (error) {
      console.error('Transition error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  // Simple status update (no PayIn/PayOut needed)
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order');
      }

      toast.success('Order status updated successfully');
      onRefresh();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  const columns = useOrderColumns({ onStatusChange: handleStatusChange });

  // Bulk cancel action
  const handleBulkCancel = async (selectedOrders: Order[]) => {
    try {
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          orderIds: selectedOrders.map(o => o.id)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel orders');
      }

      toast.success(`${selectedOrders.length} orders cancelled`);
      onRefresh();
    } catch (error) {
      console.error('[Bulk Cancel] Error:', error);
      toast.error('Failed to cancel orders');
    }
  };

  // Export selected orders
  const handleExport = (selectedIds?: string[]) => {
    const ordersToExport = selectedIds 
      ? orders.filter(o => selectedIds.includes(o.id))
      : orders;

    // Generate CSV
    const headers = ['Reference', 'Customer', 'Status', 'Crypto Amount', 'Total', 'Created'];
    const rows = ordersToExport.map(order => [
      order.paymentReference,
      order.user.email,
      order.status,
      `${order.cryptoAmount} ${order.currencyCode}`,
      `${order.totalFiat} ${order.fiatCurrencyCode}`,
      new Date(order.createdAt).toLocaleDateString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${ordersToExport.length} orders`);
  };

  // Navigate to order detail page
  const handleRowClick = (order: Order) => {
    router.push(`/admin/orders/${order.id}`);
  };

  return (
    <>
      <DataTableAdvanced
        columns={columns}
        data={orders}
        isLoading={loading}
        searchKey="paymentReference"
        searchPlaceholder="Search by reference or email..."
        enableRowSelection
        enableExport
        bulkActions={[
          {
            label: 'Cancel Selected',
            onClick: handleBulkCancel,
            variant: 'destructive'
          },
          {
            label: 'Export Selected',
            onClick: (selected) => handleExport(selected.map((o: Order) => o.id))
          }
        ]}
        onExport={handleExport}
        exportFileName={`orders-${new Date().toISOString().split('T')[0]}`}
        onRowClick={handleRowClick}
        pageSize={20}
        defaultDensity="standard"
      />

      {/* Order Transition Dialog */}
      {transitionDialog.order && transitionDialog.fromStatus && transitionDialog.toStatus && (
        <OrderTransitionDialog
          open={transitionDialog.open}
          onOpenChange={(open) => setTransitionDialog({ ...transitionDialog, open })}
          order={transitionDialog.order}
          fromStatus={transitionDialog.fromStatus}
          toStatus={transitionDialog.toStatus}
          onConfirm={handleTransitionConfirm}
          paymentMethods={paymentMethods}
          fiatCurrencies={fiatCurrencies}
          cryptocurrencies={cryptocurrencies}
          networks={networks}
        />
      )}
    </>
  );
}

