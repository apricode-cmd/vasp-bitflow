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
import { formatDistanceToNow } from 'date-fns';

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

  const stats = [
    {
      label: 'Expected Amount',
      value: `${symbol}${payIn.expectedAmount.toFixed(2)} ${code}`,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Received Amount',
      value: payIn.receivedAmount 
        ? `${symbol}${payIn.receivedAmount.toFixed(2)} ${code}`
        : 'Not yet received',
      icon: payIn.amountMismatch ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
      color: payIn.amountMismatch 
        ? 'text-red-600 bg-red-50 dark:bg-red-950'
        : 'text-green-600 bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Created',
      value: formatDistanceToNow(new Date(payIn.createdAt), { addSuffix: true }),
      icon: <Clock className="h-4 w-4" />,
      color: 'text-gray-600 bg-gray-50 dark:bg-gray-900',
    },
    {
      label: 'Processing Time',
      value: payIn.verifiedAt || payIn.reconciledAt
        ? formatDistanceToNow(
            new Date(payIn.verifiedAt || payIn.reconciledAt!),
            { addSuffix: false }
          )
        : 'In progress',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold">
                  {stat.value}
                </p>
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

