/**
 * Enhanced Admin Dashboard V2
 * 
 * Comprehensive dashboard with real-time stats, activity feed, and system health
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatRelativeTime } from '@/lib/formatters';
import { Users, ShoppingCart, CheckCircle, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    paymentPending: number;
    processing: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  kyc: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  volume: {
    totalFiat: number;
    totalCrypto: number;
    byCurrency: Array<{
      currencyCode: string;
      fiatCurrencyCode: string;
      _sum: { totalFiat: number; cryptoAmount: number };
    }>;
  };
  systemHealth: {
    tradingPairs: number;
    paymentMethods: number;
    platformWallets: number;
    apiKeys: number;
    integrations: Array<{
      service: string;
      status: string;
      isEnabled: boolean;
    }>;
  };
  recentOrders: any[];
  recentKyc: any[];
  recentActivity: any[];
}

export default function DashboardV2Page(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time platform overview</p>
        </div>
        <Button onClick={fetchStats} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.orders.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.volume.totalFiat, 'EUR')}</div>
            <p className="text-xs text-muted-foreground">
              Completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.kyc.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.kyc.approved} approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
          <CardDescription>Current orders by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.orders.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.orders.paymentPending}</div>
              <div className="text-sm text-muted-foreground">Payment Pending</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.orders.processing}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.orders.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.orders.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Platform configuration status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Trading Pairs</span>
              <Badge>{stats.systemHealth.tradingPairs} active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment Methods</span>
              <Badge>{stats.systemHealth.paymentMethods} active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Platform Wallets</span>
              <Badge>{stats.systemHealth.platformWallets} active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Keys</span>
              <Badge>{stats.systemHealth.apiKeys} active</Badge>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Integrations</div>
              {stats.systemHealth.integrations.map((integration) => (
                <div key={integration.service} className="flex items-center justify-between mb-2">
                  <span className="text-sm capitalize">{integration.service}</span>
                  <Badge
                    variant={
                      integration.status === 'active' && integration.isEnabled
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {integration.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest admin actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Activity className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {activity.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.entity} • {formatRelativeTime(activity.createdAt)}
                    </div>
                  </div>
                </div>
              ))}

              {stats.recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & KYC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/admin/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{order.paymentReference}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.user?.profile?.firstName} {order.user?.profile?.lastName}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge>{order.status}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                    </div>
                  </div>
                </div>
              ))}

              {stats.recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No orders yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending KYC Reviews</CardTitle>
              <Link href="/admin/kyc">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentKyc.slice(0, 5).map((kyc: any) => (
                <div key={kyc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">
                      {kyc.user?.profile?.firstName} {kyc.user?.profile?.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {kyc.user?.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{kyc.status}</Badge>
                    {kyc.submittedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(kyc.submittedAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {stats.recentKyc.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending KYC reviews
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






