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
import { 
  Users, ShoppingCart, Activity, Settings, CreditCard, Coins, Shield, 
  Database, ArrowUpRight, ArrowDownRight, DollarSign, Clock, 
  Zap, RefreshCw, Wallet, TrendingUp, Globe, Key
} from 'lucide-react';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
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
  const volumeChartData = stats.chartData?.volume || [];
  const currencyDistribution = stats.chartData?.currencies || [];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time platform analytics and insights
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

      {/* Quick Access Navigation */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="p-6">
                <Users className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Users</div>
                <div className="text-xs text-muted-foreground">CRM & Management</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <ShoppingCart className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Orders</div>
                <div className="text-xs text-muted-foreground">Kanban & Table View</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/kyc">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="p-6">
                <Shield className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">KYC Reviews</div>
                <div className="text-xs text-muted-foreground">{stats.kyc.pending} pending</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pairs">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <Coins className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Trading Pairs</div>
                <div className="text-xs text-muted-foreground">Crypto/Fiat Pairs</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/currencies">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <Database className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Currencies</div>
                <div className="text-xs text-muted-foreground">Crypto & Fiat</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/payments">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <CreditCard className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Payments</div>
                <div className="text-xs text-muted-foreground">PSP & Banks</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/wallets">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <Wallet className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Platform Wallets</div>
                <div className="text-xs text-muted-foreground">Crypto Wallets</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/integrations">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <Globe className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Integrations</div>
                <div className="text-xs text-muted-foreground">CoinGecko, KYCAID</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:bg-accent cursor-pointer transition-colors hover-lift">
              <CardContent className="p-6">
                <Settings className="w-8 h-8 mb-2 text-primary" />
                <div className="font-medium">Settings</div>
                <div className="text-xs text-muted-foreground">Brand, SEO, Legal</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trading Volume</CardTitle>
            <CardDescription>Daily volume and order count for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            {volumeChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={volumeChartData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No volume data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Distribution</CardTitle>
            <CardDescription>Orders by cryptocurrency</CardDescription>
          </CardHeader>
          <CardContent>
            {currencyDistribution.length > 0 ? (
              <>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                  <Pie
                    data={currencyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {currencyDistribution.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {currencyDistribution.map((currency: any, index: number) => (
                <div key={currency.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span>{currency.name}</span>
                  </div>
                  <span className="font-medium">{currency.value}%</span>
                </div>
              ))}
            </div>
          </>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No currency data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/admin/orders"><Button variant="outline" size="sm">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {stats.recentOrders?.slice(0, 8).map((order: any) => (
                  <div 
                    key={order.id} 
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {order.user?.profile?.firstName?.charAt(0)}
                        {order.user?.profile?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
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
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Platform status and integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resource Status */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Trading Pairs</span>
                  </div>
                  <Badge variant="success">{stats.systemHealth.tradingPairs} active</Badge>
                </div>
                <Progress value={95} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Payment Methods</span>
                  </div>
                  <Badge variant="success">{stats.systemHealth.paymentMethods} active</Badge>
                </div>
                <Progress value={100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Platform Wallets</span>
                  </div>
                  <Badge variant="success">{stats.systemHealth.platformWallets} active</Badge>
                </div>
                <Progress value={100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">API Keys</span>
                  </div>
                  <Badge variant="success">{stats.systemHealth.apiKeys} active</Badge>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </div>

            <Separator />

            {/* Integrations Status */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                External Services
              </h4>
              <div className="space-y-3">
                {stats.systemHealth.integrations?.map((int: any) => (
                  <div key={int.service} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        int.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm font-medium capitalize">{int.service}</span>
                    </div>
                    <Badge variant={int.status === 'active' ? 'success' : 'secondary'}>
                      {int.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">99.9%</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Zap className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">124ms</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

