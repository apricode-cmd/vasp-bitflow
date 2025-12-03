/**
 * VirtualIbanQuickStats Component
 * 
 * Quick stats для детальной страницы счёта
 * Переиспользует QuickStats компонент
 */

'use client';

import { QuickStats, QuickStat } from '@/components/admin/QuickStats';
import { formatCurrency } from '@/lib/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowDownToLine, 
  Clock 
} from 'lucide-react';

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
  const quickStats: QuickStat[] = [
    {
      label: 'Current Balance',
      value: formatCurrency(stats.balance, stats.currency),
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'blue',
    },
    {
      label: 'Total Transactions',
      value: stats.totalTransactions,
      icon: <ArrowDownToLine className="h-4 w-4" />,
      color: 'default',
    },
    {
      label: 'Total Received',
      value: formatCurrency(stats.totalReceived, stats.currency),
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'green',
    },
    {
      label: 'Unreconciled',
      value: stats.unreconciledCount,
      description: 'Need manual review',
      icon: <Clock className="h-4 w-4" />,
      color: stats.unreconciledCount > 0 ? 'warning' : 'default',
    },
  ];

  return <QuickStats stats={quickStats} isLoading={isLoading} />;
}





