/**
 * FinancialSummary Component
 * 
 * Displays user financial statistics in a card
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, ShoppingCart, CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';

interface FinancialSummaryProps {
  stats: {
    totalSpent: number;
    totalOrders: number;
    completedOrders: number;
    processingOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    preferredCurrency?: string;
  };
}

export function FinancialSummary({ stats }: FinancialSummaryProps): JSX.Element {
  const financialItems = [
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: 'Total Volume',
      value: formatCurrency(stats.totalSpent, 'EUR'),
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: <ShoppingCart className="h-4 w-4" />,
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Completed',
      value: `${stats.completedOrders} orders`,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Processing',
      value: `${stats.processingOrders} orders`,
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Cancelled',
      value: `${stats.cancelledOrders} orders`,
      color: 'text-red-600 dark:text-red-400',
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: 'Average Order',
      value: formatCurrency(stats.averageOrderValue, 'EUR'),
      color: 'text-foreground',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {financialItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`mt-0.5 ${item.color}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`font-medium ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}

        {stats.preferredCurrency && (
          <div className="flex items-start gap-3 pt-2 border-t">
            <div className="text-muted-foreground mt-0.5">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Preferred Currency</p>
              <p className="font-medium">{stats.preferredCurrency}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

