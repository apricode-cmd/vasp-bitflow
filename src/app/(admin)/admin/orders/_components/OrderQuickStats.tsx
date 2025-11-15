/**
 * Order Quick Stats Component
 * Dashboard metrics for orders overview
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderStatsData {
  totalOrders: number;
  totalVolume: number;
  pendingCount: number;
  completedToday: number;
  averageOrderValue: number;
  processingCount: number;
}

interface OrderQuickStatsProps {
  stats: OrderStatsData | null;
  isLoading?: boolean;
}

export function OrderQuickStats({ stats, isLoading = false }: OrderQuickStatsProps): JSX.Element {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsConfig = [
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      description: 'All time',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Total Volume',
      value: formatCurrency(stats.totalVolume, 'EUR'),
      description: 'All transactions',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Pending',
      value: stats.pendingCount.toString(),
      description: 'Awaiting action',
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'Processing',
      value: stats.processingCount.toString(),
      description: 'In progress',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Completed Today',
      value: stats.completedToday.toString(),
      description: 'Last 24 hours',
      icon: CheckCircle,
      color: 'text-emerald-600'
    },
    {
      title: 'Avg Order',
      value: formatCurrency(stats.averageOrderValue, 'EUR'),
      description: 'Per order',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {statsConfig.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

