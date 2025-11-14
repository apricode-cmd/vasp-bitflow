/**
 * PayIn Quick Stats Component
 * Displays key metrics and quick actions for a single PayIn
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { formatDistanceToNow, formatDistance, differenceInHours, differenceInMinutes } from 'date-fns';

interface PayInQuickStatsProps {
  payIn: {
    amount: number;
    expectedAmount: number;
    receivedAmount: number | null;
    amountMismatch: boolean;
    currencyType: string;
    status: string;
    createdAt: string;
    verifiedAt: string | null;
    reconciledAt: string | null;
    paymentDate: string | null;
    fiatCurrency: {
      code: string;
      symbol: string;
    } | null;
    cryptocurrency: {
      code: string;
      symbol: string;
    } | null;
  };
  onMarkReceived?: () => void;
  onVerify?: () => void;
  onFail?: () => void;
}

export function PayInQuickStats({ payIn, onMarkReceived, onVerify, onFail }: PayInQuickStatsProps): JSX.Element {
  const currency = payIn.currencyType === 'FIAT' ? payIn.fiatCurrency : payIn.cryptocurrency;
  const symbol = currency?.symbol || '';
  const code = currency?.code || '';

  // Calculate time-based metrics
  const createdDate = new Date(payIn.createdAt);
  const now = new Date();
  const hoursWaiting = differenceInHours(now, createdDate);
  const minutesWaiting = differenceInMinutes(now, createdDate);
  
  // Determine urgency level
  const getUrgencyLevel = () => {
    if (payIn.status === 'RECONCILED' || payIn.status === 'VERIFIED') return 'completed';
    if (hoursWaiting > 48) return 'critical'; // 2+ days
    if (hoursWaiting > 24) return 'high';     // 1-2 days
    if (hoursWaiting > 2) return 'medium';    // 2-24 hours
    return 'normal';                          // < 2 hours
  };

  const urgency = getUrgencyLevel();

  // Calculate amount difference
  const amountDifference = payIn.receivedAmount 
    ? payIn.receivedAmount - payIn.expectedAmount 
    : 0;

  const stats = [
    // 1. Payment Status
    {
      label: 'Payment Status',
      value: (() => {
        switch (payIn.status) {
          case 'PENDING': return 'Waiting';
          case 'RECEIVED': return 'Received';
          case 'VERIFIED': return 'Verified';
          case 'RECONCILED': return 'Completed';
          case 'FAILED': return 'Failed';
          default: return payIn.status;
        }
      })(),
      subValue: payIn.receivedAmount 
        ? `${symbol}${payIn.receivedAmount.toFixed(2)} ${code}`
        : '',
      description: (() => {
        if (payIn.status === 'PENDING') return 'Awaiting customer payment';
        if (payIn.status === 'RECEIVED') return 'Needs verification';
        if (payIn.status === 'VERIFIED') return 'Ready to reconcile';
        if (payIn.status === 'RECONCILED') return 'Transaction completed';
        if (payIn.status === 'FAILED') return 'Payment rejected';
        return '';
      })(),
      icon: (() => {
        if (payIn.status === 'RECONCILED') return <CheckCircle className="h-5 w-5" />;
        if (payIn.status === 'VERIFIED') return <CheckCircle className="h-5 w-5" />;
        if (payIn.status === 'FAILED') return <XCircle className="h-5 w-5" />;
        if (payIn.status === 'RECEIVED') return <AlertTriangle className="h-5 w-5" />;
        return <Clock className="h-5 w-5" />;
      })(),
      color: (() => {
        if (payIn.status === 'RECONCILED') return 'text-green-600 bg-green-50 dark:bg-green-950';
        if (payIn.status === 'VERIFIED') return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
        if (payIn.status === 'FAILED') return 'text-red-600 bg-red-50 dark:bg-red-950';
        if (payIn.status === 'RECEIVED') return 'text-orange-600 bg-orange-50 dark:bg-orange-950';
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900';
      })(),
    },
    // 2. Amount Status
    {
      label: 'Amount Status',
      value: payIn.receivedAmount 
        ? (payIn.amountMismatch 
            ? `${symbol}${Math.abs(amountDifference).toFixed(2)}`
            : 'Matched')
        : `${symbol}${payIn.expectedAmount.toFixed(2)}`,
      subValue: payIn.receivedAmount 
        ? (payIn.amountMismatch 
            ? (amountDifference > 0 ? 'Overpaid' : 'Underpaid')
            : code)
        : `Expected`,
      description: (() => {
        if (!payIn.receivedAmount) return 'Waiting for payment';
        if (payIn.amountMismatch) {
          return amountDifference > 0 
            ? 'Customer overpaid - may need refund'
            : 'Customer underpaid - contact needed';
        }
        return 'Amount matches perfectly';
      })(),
      icon: payIn.amountMismatch ? <AlertTriangle className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />,
      color: payIn.amountMismatch 
        ? 'text-red-600 bg-red-50 dark:bg-red-950'
        : payIn.receivedAmount 
          ? 'text-green-600 bg-green-50 dark:bg-green-950'
          : 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    },
    // 3. Wait Time (Urgency)
    {
      label: 'Wait Time',
      value: (() => {
        if (hoursWaiting < 1) return `${minutesWaiting}m`;
        if (hoursWaiting < 24) return `${hoursWaiting}h`;
        const days = Math.floor(hoursWaiting / 24);
        return `${days}d ${hoursWaiting % 24}h`;
      })(),
      subValue: urgency === 'critical' ? 'URGENT' : urgency === 'high' ? 'High' : '',
      description: (() => {
        if (urgency === 'critical') return '⚠️ Requires immediate attention!';
        if (urgency === 'high') return '⚠️ Action needed soon';
        if (urgency === 'medium') return 'Normal processing time';
        return 'Recently created';
      })(),
      icon: <Clock className="h-5 w-5" />,
      color: (() => {
        if (urgency === 'critical') return 'text-red-600 bg-red-50 dark:bg-red-950';
        if (urgency === 'high') return 'text-orange-600 bg-orange-50 dark:bg-orange-950';
        if (urgency === 'medium') return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900';
      })(),
    },
    // 4. Next Action
    {
      label: 'Next Action',
      value: (() => {
        if (payIn.status === 'PENDING') return 'Wait';
        if (payIn.status === 'RECEIVED') return 'Verify';
        if (payIn.status === 'VERIFIED') return 'Reconcile';
        if (payIn.status === 'RECONCILED') return 'Done';
        if (payIn.status === 'FAILED') return 'Review';
        return '-';
      })(),
      subValue: '',
      description: (() => {
        if (payIn.status === 'PENDING') return 'Waiting for customer payment';
        if (payIn.status === 'RECEIVED') return 'Check payment & verify';
        if (payIn.status === 'VERIFIED') return 'Send crypto & reconcile';
        if (payIn.status === 'RECONCILED') return 'No action required';
        if (payIn.status === 'FAILED') return 'Review & handle refund';
        return '';
      })(),
      icon: <TrendingUp className="h-5 w-5" />,
      color: payIn.status === 'RECEIVED' || payIn.status === 'VERIFIED'
        ? 'text-purple-600 bg-purple-50 dark:bg-purple-950'
        : 'text-gray-600 bg-gray-50 dark:bg-gray-900',
      showActions: payIn.status === 'RECEIVED', // Show quick action buttons
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className={stat.showActions ? 'col-span-2 lg:col-span-1' : ''}>
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Header with icon */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <div className={`rounded-full p-2 ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>

              {/* Main value */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold leading-none">
                    {stat.value}
                  </p>
                  {stat.subValue && (
                    <Badge variant={stat.subValue === 'URGENT' || stat.subValue === 'Overpaid' || stat.subValue === 'Underpaid' ? 'destructive' : 'outline'} className="text-xs">
                      {stat.subValue}
                    </Badge>
                  )}
                </div>
                {stat.description && (
                  <p className="text-xs text-muted-foreground leading-tight">
                    {stat.description}
                  </p>
                )}
              </div>

              {/* Quick Actions (only for "Next Action" card when RECEIVED status) */}
              {stat.showActions && payIn.status === 'RECEIVED' && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="flex-1"
                    onClick={onVerify}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verify
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="flex-1"
                    onClick={onFail}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Fail
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

