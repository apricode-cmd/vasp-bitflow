/**
 * UserQuickStats Component
 * 
 * Displays 4 key metrics for user:
 * - Total Orders
 * - Total Spent
 * - Pending Orders
 * - KYC Status
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { ShoppingCart, DollarSign, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger';
  description?: string;
}

interface UserQuickStatsProps {
  stats: {
    totalOrders: number;
    totalSpent: number;
    pendingOrders: number;
    kycStatus: string;
    completedOrders?: number;
  };
  isLoading?: boolean;
}

const COLOR_CLASSES = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
};

export function UserQuickStats({ stats, isLoading = false }: UserQuickStatsProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const quickStats: QuickStat[] = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: <ShoppingCart className="h-5 w-5" />,
      color: 'default',
      description: stats.completedOrders ? `${stats.completedOrders} completed` : undefined,
    },
    {
      label: 'Total Spent',
      value: formatCurrency(stats.totalSpent, 'EUR'),
      icon: <DollarSign className="h-5 w-5" />,
      color: stats.totalSpent > 10000 ? 'success' : stats.totalSpent > 1000 ? 'default' : 'default',
      description: stats.totalOrders > 0 
        ? `Avg: ${formatCurrency(stats.totalSpent / stats.totalOrders, 'EUR')}` 
        : undefined,
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      icon: <Clock className="h-5 w-5" />,
      color: stats.pendingOrders > 0 ? 'warning' : 'default',
      description: stats.pendingOrders > 0 ? 'Requires attention' : 'All clear',
    },
    {
      label: 'KYC Status',
      value: stats.kycStatus,
      icon: <Shield className="h-5 w-5" />,
      color: 
        stats.kycStatus === 'APPROVED' ? 'success' : 
        stats.kycStatus === 'REJECTED' ? 'danger' :
        stats.kycStatus === 'PENDING' ? 'warning' : 'default',
      description: stats.kycStatus === 'APPROVED' ? 'Verified' : 
                   stats.kycStatus === 'PENDING' ? 'Under review' : 
                   stats.kycStatus === 'REJECTED' ? 'Not verified' : 'Not started',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {quickStats.map((stat, index) => {
        const colorClass = COLOR_CLASSES[stat.color || 'default'];

        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <div className={cn('opacity-70', colorClass)}>
                  {stat.icon}
                </div>
              </div>
              <div className="space-y-1">
                <p className={cn('text-2xl font-bold', colorClass)}>
                  {stat.value}
                </p>
                {stat.description && (
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

