/**
 * QuickStats Component
 * 
 * Displays key metrics in a compact horizontal layout
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickStat {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'blue' | 'green' | 'red' | 'gray';
}

interface QuickStatsProps {
  stats: QuickStat[];
  isLoading?: boolean;
}

const COLOR_CLASSES = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  gray: 'text-gray-600 dark:text-gray-400',
};

export function QuickStats({ stats, isLoading = false }: QuickStatsProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const colorClass = COLOR_CLASSES[stat.color || 'default'];
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                {stat.icon && (
                  <div className={cn('opacity-70', colorClass)}>
                    {stat.icon}
                  </div>
                )}
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
                {stat.trend && (
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trend.value > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : stat.trend.value < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : null}
                    <span className={cn(
                      'font-medium',
                      stat.trend.value > 0 ? 'text-green-600' : 
                      stat.trend.value < 0 ? 'text-red-600' : 
                      'text-muted-foreground'
                    )}>
                      {stat.trend.value !== 0 && (stat.trend.value > 0 ? '+' : '')}{stat.trend.value}%
                    </span>
                    <span className="text-muted-foreground">{stat.trend.label}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

