/**
 * PayIn Quick Stats Component
 * Displays key metrics for a single PayIn
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { formatDistanceToNow, formatDistance } from 'date-fns';

interface PayInQuickStatsProps {
  payIn: {
    amount: number;
    expectedAmount: number;
    receivedAmount: number | null;
    amountMismatch: boolean;
    currencyType: string;
    createdAt: string;
    verifiedAt: string | null;
    reconciledAt: string | null;
    fiatCurrency: {
      code: string;
      symbol: string;
    } | null;
    cryptocurrency: {
      code: string;
      symbol: string;
    } | null;
  };
}

export function PayInQuickStats({ payIn }: PayInQuickStatsProps): JSX.Element {
  const currency = payIn.currencyType === 'FIAT' ? payIn.fiatCurrency : payIn.cryptocurrency;
  const symbol = currency?.symbol || '';
  const code = currency?.code || '';

  // Рассчитываем Processing Time
  const getProcessingTime = () => {
    const completedAt = payIn.reconciledAt || payIn.verifiedAt;
    
    if (completedAt) {
      const duration = formatDistance(
        new Date(payIn.createdAt),
        new Date(completedAt),
        { includeSeconds: true }
      );
      return {
        value: duration,
        description: 'Completed'
      };
    }
    
    const timeElapsed = formatDistanceToNow(new Date(payIn.createdAt), { addSuffix: false });
    return {
      value: timeElapsed,
      description: 'Pending'
    };
  };

  const processingTime = getProcessingTime();

  const stats = [
    {
      label: 'Expected Amount',
      value: `${symbol}${payIn.expectedAmount.toFixed(2)}`,
      subValue: code,
      description: 'Customer should pay',
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Received Amount',
      value: payIn.receivedAmount 
        ? `${symbol}${payIn.receivedAmount.toFixed(2)}`
        : 'Not received',
      subValue: payIn.receivedAmount ? code : '',
      description: payIn.receivedAmount 
        ? (payIn.amountMismatch ? '⚠️ Amount mismatch' : '✓ Amount matches')
        : 'Awaiting payment',
      icon: payIn.amountMismatch ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
      color: payIn.amountMismatch 
        ? 'text-red-600 bg-red-50 dark:bg-red-950'
        : payIn.receivedAmount 
          ? 'text-green-600 bg-green-50 dark:bg-green-950'
          : 'text-gray-600 bg-gray-50 dark:bg-gray-900',
    },
    {
      label: 'Time Since Created',
      value: formatDistanceToNow(new Date(payIn.createdAt), { addSuffix: false }),
      subValue: '',
      description: `Created ${formatDistanceToNow(new Date(payIn.createdAt), { addSuffix: true })}`,
      icon: <Clock className="h-4 w-4" />,
      color: 'text-gray-600 bg-gray-50 dark:bg-gray-900',
    },
    {
      label: 'Processing Time',
      value: processingTime.value,
      subValue: '',
      description: processingTime.description === 'Completed' 
        ? '✓ Payment processed' 
        : '⏳ Awaiting verification',
      icon: <Clock className="h-4 w-4" />,
      color: processingTime.description === 'Completed'
        ? 'text-green-600 bg-green-50 dark:bg-green-950'
        : 'text-orange-600 bg-orange-50 dark:bg-orange-950',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                  {stat.subValue && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.subValue}
                    </span>
                  )}
                </div>
                {stat.description && (
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                )}
              </div>
              <div className={`rounded-full p-3 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

