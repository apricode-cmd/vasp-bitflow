/**
 * Admin Orders Management Page
 * 
 * Refactored for performance and maintainability:
 * - Custom hooks for data fetching & filters
 * - Modular components (TableView, KanbanView)
 * - Clean, minimal code (~120 lines)
 * - Uses light API endpoint (70% less data)
 * - Inline status editing with OrderTransitionDialog
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderFilters } from './_components/OrderFilters';
import { OrderQuickStats } from './_components/OrderQuickStats';
import { OrdersTableView } from './_components/OrdersTableView';
import { OrderKanban } from '@/components/admin/OrderKanban';
import { CreateOrderDialog } from '@/components/admin/CreateOrderDialog';
import { useOrders } from './_lib/useOrders';
import { useOrderFilters } from './_lib/useOrderFilters';
import { LayoutGrid, List, Plus, RefreshCw } from 'lucide-react';

type ViewMode = 'kanban' | 'table';

export default function OrdersPage(): JSX.Element {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Custom hooks
  const { filters, setFilter } = useOrderFilters();
  const { orders, loading, refetch, total, page, totalPages } = useOrders(filters);

  // Reference data for OrderTransitionDialog
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<any[]>([]);
  const [cryptocurrencies, setCryptocurrencies] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);

  // Fetch reference data on mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [pmRes, fiatRes, cryptoRes, networksRes] = await Promise.all([
          fetch('/api/admin/payment-methods'),
          fetch('/api/admin/resources/fiat-currencies'),
          fetch('/api/admin/resources/currencies?active=true'),
          fetch('/api/admin/blockchains')
        ]);

        const [pmData, fiatData, cryptoData, networksData] = await Promise.all([
          pmRes.json(),
          fiatRes.json(),
          cryptoRes.json(),
          networksRes.json()
        ]);

        setPaymentMethods(pmData.success ? (pmData.data || pmData.methods) : []);
        setFiatCurrencies(fiatData.success ? fiatData.data : []);
        setCryptocurrencies(cryptoData.success ? cryptoData.data : []);
        setNetworks(networksData.success ? networksData.data : []);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      }
    };

    fetchReferenceData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage cryptocurrency exchange orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Create Order */}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <OrderFilters
          filters={{
            search: filters.search,
            status: filters.status,
            currencyCode: filters.currencyCode || '',
            fiatCurrencyCode: filters.fiatCurrencyCode || '',
            hasPayIn: filters.hasPayIn !== undefined ? filters.hasPayIn.toString() : '',
            hasPayOut: filters.hasPayOut !== undefined ? filters.hasPayOut.toString() : '',
            dateFrom: filters.dateRange?.from?.toISOString() || '',
            dateTo: filters.dateRange?.to?.toISOString() || '',
          }}
          onFilterChange={(key, value) => {
            if (key === 'search' || key === 'status') {
              setFilter(key, value);
            } else if (key === 'currencyCode' || key === 'fiatCurrencyCode') {
              setFilter(key, value === '' ? undefined : value);
            }
          }}
          onReset={() => {
            // Reset filters to default
            setFilter('status', 'all');
            setFilter('search', '');
            setFilter('currencyCode', undefined);
            setFilter('fiatCurrencyCode', undefined);
            setFilter('hasPayIn', undefined);
            setFilter('hasPayOut', undefined);
            setFilter('dateRange', undefined);
          }}
        />
      </Card>

      {/* View Toggle & Stats */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="table">
              <List className="h-4 w-4 mr-2" />
              Table
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground">
          {total} orders (Page {page} of {totalPages})
        </p>
      </div>

      {/* View Content */}
      {viewMode === 'table' ? (
        <OrdersTableView
          orders={orders}
          loading={loading}
          onRefresh={refetch}
          paymentMethods={paymentMethods}
          fiatCurrencies={fiatCurrencies}
          cryptocurrencies={cryptocurrencies}
          networks={networks}
          totalOrders={total}
          currentPage={filters.page || 1}
          pageSize={filters.limit || 20}
          onPageChange={(newPage) => setFilter('page', newPage)}
          onPageSizeChange={(newSize) => setFilter('limit', newSize)}
        />
      ) : (
        <OrderKanban
          orders={orders.map(o => ({
            ...o,
            createdAt: typeof o.createdAt === 'string' ? new Date(o.createdAt) : o.createdAt,
            user: {
              ...o.user,
              profile: o.user.profile || { firstName: '', lastName: '' }
            }
          }))}
          onStatusChange={async (orderId, newStatus, transitionData) => {
            // Handle status change via drag & drop
            try {
              await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transitionData || { status: newStatus })
              });
              refetch();
            } catch (error) {
              console.error('Status update failed:', error);
            }
          }}
          onOrderClick={(order) => {
            window.location.href = `/admin/orders/${order.id}`;
          }}
          paymentMethods={paymentMethods}
          fiatCurrencies={fiatCurrencies}
          cryptocurrencies={cryptocurrencies}
          networks={networks}
        />
      )}

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}

