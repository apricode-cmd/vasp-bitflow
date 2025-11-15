/**
 * OrdersTableView Component
 * 
 * Table view for orders using DataTableAdvanced
 * Features:
 * - Row selection & bulk actions
 * - Export functionality
 * - Sorting & filtering
 * - Click to navigate to detail page
 * - Consistent with other admin pages (Users, KYC, PayIn, PayOut)
 */

'use client';

import { useRouter } from 'next/navigation';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { useOrderColumns } from '../_lib/orderColumns';
import { toast } from 'sonner';
import type { Order } from '../_lib/useOrders';

interface OrdersTableViewProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
}

export function OrdersTableView({ orders, loading, onRefresh }: OrdersTableViewProps): JSX.Element {
  const router = useRouter();
  const columns = useOrderColumns();

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
  );
}

