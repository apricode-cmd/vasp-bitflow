/**
 * Main Admin Dashboard - Enhanced CRM Overview
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/formatters';
import { ActionCenter } from '@/components/admin/dashboard/ActionCenter';
import { PerformanceIndicators } from '@/components/admin/dashboard/PerformanceIndicators';
import { 
  Users, ShoppingCart, Activity, Settings, CreditCard, Coins, Shield, 
  Database, ArrowUpRight, ArrowDownRight, DollarSign, Clock, 
  Zap, RefreshCw, Wallet, TrendingUp, Globe, Key, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Chart colors
const COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142, 71%, 45%)',
  warning: 'hsl(38, 92%, 50%)',
  danger: 'hsl(0, 84%, 60%)',
  info: 'hsl(199, 89%, 48%)',
  muted: 'hsl(var(--muted))',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboardPage(): JSX.Element {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchStats = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/admin/stats?range=${timeRange}`);
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate trends from stats
  const ordersTrend = stats.trends?.orders || 0;
  const volumeTrend = stats.trends?.volume || 0;
  const usersTrend = stats.trends?.users || 0;
  const kycTrend = stats.trends?.kyc || 0;

  // Prepare chart data from stats
  const orderFlowChartData = stats.orderFlowChartData || [];
  const currencyDistribution = stats.chartData?.currencies || [];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time platform analytics and insights
            {stats.cached && <Badge variant="secondary" className="ml-2">Cached</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v: any) => setTimeRange(v)} className="w-auto">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            onClick={fetchStats} 
            variant="outline" 
            size="icon"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Action Center - Priority #1 */}
      <ActionCenter />

      {/* Main Stats with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HoverCard>
          <HoverCardTrigger asChild>
            <Card className="hover-lift cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.orders.total}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {stats.orders.completed} completed
                  </span>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    {ordersTrend}%
                  </div>
                </div>
                <Progress value={(stats.orders.completed / stats.orders.total) * 100} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">Order Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-medium">{stats.orders.total - stats.orders.completed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Processing</p>
                  <p className="font-medium">—</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-medium">{Math.round((stats.orders.completed / stats.orders.total) * 100)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg. Time</p>
                  <p className="font-medium">2.4h</p>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <HoverCard>
          <HoverCardTrigger asChild>
            <Card className="hover-lift cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.total}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {stats.users.active} active
                  </span>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    {usersTrend}%
                  </div>
                </div>
                <Progress value={(stats.users.active / stats.users.total) * 100} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">User Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">KYC Verified</p>
                  <p className="font-medium">{stats.kyc.approved}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">New (7d)</p>
                  <p className="font-medium">—</p>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <HoverCard>
          <HoverCardTrigger asChild>
            <Card className="hover-lift cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.volume.totalFiat, 'EUR')}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Completed orders</span>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    {volumeTrend}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">Volume Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Avg Order</p>
                  <p className="font-medium">€{(stats.volume.totalFiat / stats.orders.completed).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Top Currency</p>
                  <p className="font-medium">BTC (45%)</p>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <HoverCard>
          <HoverCardTrigger asChild>
            <Card className="hover-lift cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.kyc.pending}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {stats.kyc.approved} approved
                  </span>
                  {kycTrend < 0 ? (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <ArrowDownRight className="h-3 w-3" />
                      {Math.abs(kycTrend)}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <ArrowUpRight className="h-3 w-3" />
                      {kycTrend}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">KYC Overview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Approved</p>
                  <p className="font-medium">{stats.kyc.approved}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rejected</p>
                  <p className="font-medium">—</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Time</p>
                  <p className="font-medium">4.2h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approval Rate</p>
                  <p className="font-medium">94%</p>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Performance Indicators - Compact */}
      {stats.performanceIndicators && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Performance Indicators</h2>
          <PerformanceIndicators data={stats.performanceIndicators} />
        </div>
      )}

      {/* Quick Access Navigation - Compact Single Row */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          <Link href="/admin/users">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <Users className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Users</div>
                <div className="text-xs text-muted-foreground">CRM</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <ShoppingCart className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Orders</div>
                <div className="text-xs text-muted-foreground">Kanban</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/kyc">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <Shield className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">KYC</div>
                <div className="text-xs text-muted-foreground">{stats.kyc.pending} pending</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pay-in">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <ArrowDownRight className="w-6 h-6 mb-2 text-green-600 group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Pay-In</div>
                <div className="text-xs text-muted-foreground">Incoming</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pay-out">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <ArrowUpRight className="w-6 h-6 mb-2 text-red-600 group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Pay-Out</div>
                <div className="text-xs text-muted-foreground">Outgoing</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/currencies">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <Coins className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Currencies</div>
                <div className="text-xs text-muted-foreground">Crypto</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/integrations">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <Globe className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Integrations</div>
                <div className="text-xs text-muted-foreground">APIs</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:bg-accent cursor-pointer transition-all hover:shadow-md group">
              <CardContent className="p-4">
                <Settings className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
                <div className="font-medium text-sm">Settings</div>
                <div className="text-xs text-muted-foreground">System</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Flow & Conversion Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Flow & Conversion</CardTitle>
                <CardDescription>Daily order statuses and success rate</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {orderFlowChartData.length > 0 
                    ? Math.round(
                        orderFlowChartData.reduce((sum: number, d: any) => sum + d.conversionRate, 0) / 
                        orderFlowChartData.length
                      )
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Conversion</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orderFlowChartData.length > 0 ? (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <span>Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span>Cancelled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span>Pending</span>
                  </div>
                </div>

                {/* Stacked Bar Chart */}
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orderFlowChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold mb-2">{data.date}</p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                      Completed
                                    </span>
                                    <span className="font-semibold">{data.completed}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                      Processing
                                    </span>
                                    <span className="font-semibold">{data.processing}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                      Cancelled
                                    </span>
                                    <span className="font-semibold">{data.cancelled}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                      Pending
                                    </span>
                                    <span className="font-semibold">{data.pending}</span>
                                  </div>
                                  <div className="border-t pt-2 mt-2">
                                    <div className="flex justify-between">
                                      <span>Total Orders:</span>
                                      <span className="font-bold">{data.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Conversion:</span>
                                      <span className="font-bold text-green-600">{data.conversionRate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Revenue:</span>
                                      <span className="font-bold">€{data.revenue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Avg Order:</span>
                                      <span className="font-bold">€{data.avgOrderValue.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="processing" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="cancelled" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No order data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders with Actions */}
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
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {stats.recentOrders?.slice(0, 10).map((order: any) => (
                  <Link 
                    key={order.id}
                    href={`/admin/orders?id=${order.id}`}
                    scroll={false}
                  >
                    <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 hover:shadow-sm transition-all cursor-pointer group">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {order.user?.profile?.firstName?.charAt(0)}
                          {order.user?.profile?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {order.paymentReference}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {order.currencyCode}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.user?.profile?.firstName} {order.user?.profile?.lastName}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={
                          order.status === 'COMPLETED' ? 'success' : 
                          order.status === 'PENDING' ? 'warning' : 
                          order.status === 'CANCELLED' ? 'destructive' : 'default'
                        }>
                          {order.status}
                        </Badge>
                        <p className="text-xs font-medium">
                          {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

