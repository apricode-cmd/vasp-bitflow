/**
 * VirtualIbanQuickStats Component
 * 
 * Enhanced quick stats для детальной страницы счёта
 * С визуальной иерархией и цветовым кодированием
 */

'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { 
  Wallet,
  ArrowDownUp,
  TrendingUp, 
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualIbanQuickStatsProps {
  stats: {
    balance: number;
    currency: string;
    totalTransactions: number;
    totalReceived: number;
    unreconciledCount: number;
  };
  isLoading?: boolean;
}

export function VirtualIbanQuickStats({ 
  stats, 
  isLoading = false 
}: VirtualIbanQuickStatsProps): JSX.Element {
  const statCards = [
    {
      label: 'Current Balance',
      value: formatCurrency(stats.balance, stats.currency),
      icon: Wallet,
      trend: stats.balance > 0 ? 'positive' : 'neutral',
      bgGradient: 'from-blue-500/10 to-blue-600/5',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      label: 'Total Transactions',
      value: stats.totalTransactions.toString(),
      subValue: 'completed',
      icon: ArrowDownUp,
      trend: 'neutral',
      bgGradient: 'from-slate-500/10 to-slate-600/5',
      iconColor: 'text-slate-600 dark:text-slate-400',
      borderColor: 'border-slate-200 dark:border-slate-800',
    },
    {
      label: 'Total Received',
      value: formatCurrency(stats.totalReceived, stats.currency),
      icon: TrendingUp,
      trend: 'positive',
      bgGradient: 'from-green-500/10 to-green-600/5',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      label: 'Unreconciled',
      value: stats.unreconciledCount.toString(),
      subValue: stats.unreconciledCount > 0 ? 'needs review' : 'all clear',
      icon: AlertCircle,
      trend: stats.unreconciledCount > 0 ? 'warning' : 'positive',
      bgGradient: stats.unreconciledCount > 0 
        ? 'from-orange-500/10 to-orange-600/5' 
        : 'from-green-500/10 to-green-600/5',
      iconColor: stats.unreconciledCount > 0 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-green-600 dark:text-green-400',
      borderColor: stats.unreconciledCount > 0 
        ? 'border-orange-200 dark:border-orange-800' 
        : 'border-green-200 dark:border-green-800',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className={cn(
              "relative overflow-hidden transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02]",
              stat.borderColor
            )}
          >
            {/* Background Gradient */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-50",
              stat.bgGradient
            )} />
            
            {/* Content */}
            <div className="relative p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {stat.label}
                  </p>
                  <div className="space-y-1">
                    <p className={cn(
                      "text-2xl font-bold tracking-tight",
                      isLoading && "animate-pulse"
                    )}>
                      {isLoading ? '—' : stat.value}
                    </p>
                    {stat.subValue && (
                      <p className="text-xs text-muted-foreground">
                        {stat.subValue}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Icon */}
                <div className={cn(
                  "rounded-full p-3 bg-background/60 backdrop-blur-sm",
                  stat.iconColor
                )}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}





