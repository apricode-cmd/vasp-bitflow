/**
 * PayOut Quick Stats Component
 * Displays key metrics and quick actions for a single PayOut
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  XCircle,
  Coins
} from 'lucide-react';
import { formatDistanceToNow, formatDistance, differenceInHours, differenceInMinutes } from 'date-fns';

interface PayOutQuickStatsProps {
  payOut: {
    amount: number;
    networkFee: number | null;
    status: string;
    confirmations: number;
    createdAt: string;
    sentAt: string | null;
    confirmedAt: string | null;
    processedAt: string | null;
    cryptocurrency: {
      code: string;
      symbol: string;
    };
    network: {
      name: string;
    };
  };
  onMarkAsSent?: () => void;
  onConfirm?: () => void;
  onFail?: () => void;
}

export function PayOutQuickStats({ payOut, onMarkAsSent, onConfirm, onFail }: PayOutQuickStatsProps): JSX.Element {
  const symbol = payOut.cryptocurrency?.symbol || '';
  const code = payOut.cryptocurrency?.code || '';

  // Calculate time-based metrics
  const createdDate = new Date(payOut.createdAt);
  const now = new Date();
  const hoursWaiting = differenceInHours(now, createdDate);
  const minutesWaiting = differenceInMinutes(now, createdDate);
  
  // Determine urgency level
  const getUrgencyLevel = () => {
    if (payOut.status === 'CONFIRMED') return 'completed';
    if (payOut.status === 'FAILED' || payOut.status === 'CANCELLED') return 'failed';
    if (hoursWaiting > 24) return 'critical'; // 1+ day
    if (hoursWaiting > 4) return 'high';      // 4-24 hours
    if (hoursWaiting > 1) return 'medium';    // 1-4 hours
    return 'normal';                          // < 1 hour
  };

  const urgency = getUrgencyLevel();

  // Calculate net amount (after fees)
  const netAmount = payOut.amount - (payOut.networkFee || 0);

  const stats = [
    // 1. Transaction Status
    {
      label: 'Transaction Status',
      value: (() => {
        switch (payOut.status) {
          case 'PENDING': return 'Pending';
          case 'QUEUED': return 'Queued';
          case 'PROCESSING': return 'Processing';
          case 'SENT': return 'Sent';
          case 'CONFIRMING': return 'Confirming';
          case 'CONFIRMED': return 'Confirmed';
          case 'FAILED': return 'Failed';
          case 'CANCELLED': return 'Cancelled';
          default: return payOut.status;
        }
      })(),
      subValue: payOut.confirmations > 0 ? `${payOut.confirmations} conf` : '',
      description: (() => {
        if (payOut.status === 'PENDING' || payOut.status === 'QUEUED') return 'Awaiting admin approval';
        if (payOut.status === 'PROCESSING') return 'Preparing transaction';
        if (payOut.status === 'SENT') return 'Transaction broadcasted';
        if (payOut.status === 'CONFIRMING') return `Waiting for confirmations`;
        if (payOut.status === 'CONFIRMED') return 'Transaction confirmed';
        if (payOut.status === 'FAILED') return 'Transaction failed';
        if (payOut.status === 'CANCELLED') return 'Transaction cancelled';
        return '';
      })(),
      icon: (() => {
        if (payOut.status === 'CONFIRMED') return <CheckCircle className="h-5 w-5" />;
        if (payOut.status === 'SENT' || payOut.status === 'CONFIRMING') return <Send className="h-5 w-5" />;
        if (payOut.status === 'FAILED' || payOut.status === 'CANCELLED') return <XCircle className="h-5 w-5" />;
        return <Clock className="h-5 w-5" />;
      })(),
      color: (() => {
        if (payOut.status === 'CONFIRMED') return 'text-green-600 bg-green-50 dark:bg-green-950';
        if (payOut.status === 'SENT' || payOut.status === 'CONFIRMING') return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
        if (payOut.status === 'FAILED' || payOut.status === 'CANCELLED') return 'text-red-600 bg-red-50 dark:bg-red-950';
        if (payOut.status === 'PROCESSING') return 'text-purple-600 bg-purple-50 dark:bg-purple-950';
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900';
      })(),
    },
    // 2. Amount Info
    {
      label: 'Crypto Amount',
      value: `${symbol}${payOut.amount.toFixed(8)}`,
      subValue: code,
      description: payOut.networkFee 
        ? `Network fee: ${symbol}${payOut.networkFee.toFixed(8)} • Net: ${symbol}${netAmount.toFixed(8)}`
        : `Net amount to send`,
      icon: <Coins className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    },
    // 3. Wait Time (Urgency)
    {
      label: 'Time Elapsed',
      value: (() => {
        if (hoursWaiting < 1) return `${minutesWaiting}m`;
        if (hoursWaiting < 24) return `${hoursWaiting}h`;
        const days = Math.floor(hoursWaiting / 24);
        return `${days}d ${hoursWaiting % 24}h`;
      })(),
      subValue: urgency === 'critical' ? 'URGENT' : urgency === 'high' ? 'High' : '',
      description: (() => {
        if (urgency === 'critical') return '⚠️ Customer waiting - urgent action needed!';
        if (urgency === 'high') return '⚠️ Action recommended';
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
        if (payOut.status === 'PENDING' || payOut.status === 'QUEUED') return 'Process';
        if (payOut.status === 'PROCESSING') return 'Send';
        if (payOut.status === 'SENT') return 'Wait';
        if (payOut.status === 'CONFIRMING') return 'Confirm';
        if (payOut.status === 'CONFIRMED') return 'Done';
        if (payOut.status === 'FAILED') return 'Review';
        return '-';
      })(),
      subValue: '',
      description: (() => {
        if (payOut.status === 'PENDING' || payOut.status === 'QUEUED') return 'Prepare & broadcast transaction';
        if (payOut.status === 'PROCESSING') return 'Send crypto to customer';
        if (payOut.status === 'SENT') return 'Monitor blockchain confirmations';
        if (payOut.status === 'CONFIRMING') return 'Mark as confirmed when ready';
        if (payOut.status === 'CONFIRMED') return 'Transaction complete';
        if (payOut.status === 'FAILED') return 'Review error & retry if needed';
        return '';
      })(),
      icon: <TrendingUp className="h-5 w-5" />,
      color: (payOut.status === 'PROCESSING' || payOut.status === 'SENT' || payOut.status === 'CONFIRMING')
        ? 'text-purple-600 bg-purple-50 dark:bg-purple-950'
        : 'text-gray-600 bg-gray-50 dark:bg-gray-900',
      showActions: ['PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'CONFIRMING'].includes(payOut.status), // Show quick action buttons
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
                    <Badge variant={stat.subValue === 'URGENT' ? 'destructive' : 'outline'} className="text-xs">
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

              {/* Quick Actions */}
              {stat.showActions && (
                <div className="flex gap-2 pt-2">
                  {(payOut.status === 'PENDING' || payOut.status === 'QUEUED' || payOut.status === 'PROCESSING') && (
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="flex-1"
                      onClick={onMarkAsSent}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Mark Sent
                    </Button>
                  )}
                  {(payOut.status === 'SENT' || payOut.status === 'CONFIRMING') && (
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="flex-1"
                      onClick={onConfirm}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirm
                    </Button>
                  )}
                  {payOut.status !== 'CONFIRMED' && payOut.status !== 'FAILED' && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="flex-1"
                      onClick={onFail}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Fail
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

