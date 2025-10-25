/**
 * Orders List Page
 * 
 * Enhanced view and management of cryptocurrency purchase orders with tabs and filtering
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import { CurrencyIcon } from '@/components/features/CurrencyIcon';
import { formatDateTime, formatFiatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { 
  Package, ShoppingCart, Clock, CheckCircle2, XCircle, 
  ArrowRight, Filter, RefreshCw
} from 'lucide-react';
import type { OrderStatus } from '@prisma/client';

interface Order {
  id: string;
  currencyCode: string;
  fiatCurrencyCode: string;
  cryptoAmount: number;
  totalFiat: number;
  status: OrderStatus;
  createdAt: Date;
  paymentReference: string;
}

export default function OrdersPage(): React.ReactElement {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | OrderStatus>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by tab
  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    PENDING: orders.filter(o => o.status === 'PENDING' || o.status === 'PAYMENT_PENDING').length,
    PROCESSING: orders.filter(o => o.status === 'PROCESSING' || o.status === 'PAYMENT_RECEIVED').length,
    COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED' || o.status === 'EXPIRED').length,
  };

  const EmptyState = ({ status }: { status: string }) => (
    <div className="text-center py-16">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
        <Package className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No {status} orders</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {status === 'all' 
          ? 'You haven\'t placed any orders yet. Start your crypto journey today!'
          : `You don't have any ${status.toLowerCase()} orders at the moment.`}
      </p>
      {status === 'all' && (
        <Link href="/buy">
          <Button size="lg" className="gradient-primary">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Place Your First Order
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and track your cryptocurrency purchase orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/buy">
            <Button size="lg" className="gradient-primary">
              <ShoppingCart className="h-5 w-5 mr-2" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-5">
          <TabsTrigger value="all" className="gap-2">
            <Filter className="h-4 w-4" />
            All
            {orderCounts.all > 0 && (
              <Badge variant="secondary" className="ml-1">{orderCounts.all}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {orderCounts.PENDING > 0 && (
              <Badge variant="secondary" className="ml-1">{orderCounts.PENDING}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="PROCESSING" className="gap-2">
            Processing
            {orderCounts.PROCESSING > 0 && (
              <Badge variant="secondary" className="ml-1">{orderCounts.PROCESSING}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
            {orderCounts.COMPLETED > 0 && (
              <Badge variant="secondary" className="ml-1">{orderCounts.COMPLETED}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" className="gap-2">
            <XCircle className="h-4 w-4" />
            Cancelled
            {orderCounts.CANCELLED > 0 && (
              <Badge variant="secondary" className="ml-1">{orderCounts.CANCELLED}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-96" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState status={activeTab} />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Link 
                  key={order.id} 
                  href={`/orders/${order.id}`}
                  className="block group"
                >
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {/* Currency Icon */}
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <CurrencyIcon 
                            currency={order.currencyCode as 'BTC' | 'ETH' | 'USDT' | 'SOL'} 
                            size={28}
                          />
                        </div>

                        {/* Order Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold truncate">
                              {formatCryptoAmount(order.cryptoAmount, order.currencyCode)} {order.currencyCode}
                            </h3>
                            <Badge variant="outline">
                              {order.currencyCode}/{order.fiatCurrencyCode}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {formatFiatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                            </span>
                            <span>•</span>
                            <span>{formatDateTime(order.createdAt)}</span>
                            <span>•</span>
                            <span className="font-mono text-xs">
                              {order.paymentReference}
                            </span>
                          </div>
                        </div>

                        {/* Status & Action */}
                        <div className="flex items-center gap-4">
                          <OrderStatusBadge status={order.status} />
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
