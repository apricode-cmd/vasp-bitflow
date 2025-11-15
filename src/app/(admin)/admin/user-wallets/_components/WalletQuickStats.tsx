/**
 * WalletQuickStats Component
 * 
 * Displays key metrics for user wallets
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Zap
} from 'lucide-react';

interface StatItem {
  label: string;
  value: string;
  description: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}

interface WalletQuickStatsProps {
  stats: StatItem[];
  isLoading?: boolean;
}

const iconMap = {
  'Total Wallets': Wallet,
  'Verified': CheckCircle2,
  'Unverified': AlertCircle,
  'Active Wallets': Zap
};

const colorClasses = {
  blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  green: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
  amber: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
  purple: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950'
};

export function WalletQuickStats({ stats, isLoading }: WalletQuickStatsProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = iconMap[stat.label as keyof typeof iconMap] || Wallet;
        const colorClass = colorClasses[stat.color];

        return (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

