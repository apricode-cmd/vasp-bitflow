/**
 * Order PayIn Tab
 * Displays incoming payment details and verification
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { 
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  User,
  Calendar,
  FileText,
  ExternalLink,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface OrderPayInTabProps {
  order: {
    id: string;
    totalFiat: number;
    fiatCurrencyCode: string;
    payIn?: {
      id: string;
      status: string;
      amount: number;
      currencyCode: string;
      senderName?: string | null;
      paymentMethodCode?: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
  };
  onCreatePayIn?: () => void;
}

const PAYIN_STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-500',
    description: 'Waiting for payment from customer'
  },
  RECEIVED: {
    label: 'Payment Received',
    icon: CheckCircle,
    color: 'bg-blue-500',
    description: 'Payment received, awaiting verification'
  },
  VERIFIED: {
    label: 'Verified',
    icon: CheckCircle,
    color: 'bg-green-500',
    description: 'Payment verified and approved'
  },
  PARTIAL: {
    label: 'Partial Payment',
    icon: AlertCircle,
    color: 'bg-orange-500',
    description: 'Received amount differs from expected'
  },
  MISMATCH: {
    label: 'Amount Mismatch',
    icon: AlertCircle,
    color: 'bg-red-500',
    description: 'Significant amount discrepancy detected'
  },
  RECONCILED: {
    label: 'Reconciled',
    icon: CheckCircle,
    color: 'bg-emerald-500',
    description: 'Payment reconciled in accounting'
  },
  FAILED: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'bg-red-500',
    description: 'Payment failed or rejected'
  },
  REFUNDED: {
    label: 'Refunded',
    icon: TrendingDown,
    color: 'bg-purple-500',
    description: 'Payment refunded to customer'
  },
  EXPIRED: {
    label: 'Expired',
    icon: Clock,
    color: 'bg-gray-500',
    description: 'Payment window expired'
  }
};

export function OrderPayInTab({ order, onCreatePayIn }: OrderPayInTabProps): JSX.Element {
  if (!order.payIn) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No PayIn Record</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This order doesn't have an associated PayIn record yet. Create one to track the incoming payment.
            </p>
          </div>
          <Button onClick={onCreatePayIn}>
            <Plus className="h-4 w-4 mr-2" />
            Create PayIn Record
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = PAYIN_STATUS_CONFIG[order.payIn.status as keyof typeof PAYIN_STATUS_CONFIG] || PAYIN_STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const amountDifference = order.payIn.amount - order.totalFiat;
  const hasDiscrepancy = Math.abs(amountDifference) > 0.01;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            PayIn Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-full ${statusConfig.color} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{statusConfig.label}</h4>
                <Badge variant="outline">{order.payIn.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium">{formatDateTime(order.payIn.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm font-medium">{formatDateTime(order.payIn.updatedAt)}</p>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href={`/admin/pay-in/${order.payIn.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full PayIn Details
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Amount Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Amount Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Expected Amount</span>
              <span className="font-semibold">
                {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Received Amount</span>
              <span className="font-semibold">
                {formatCurrency(order.payIn.amount, order.payIn.currencyCode)}
              </span>
            </div>

            {hasDiscrepancy && (
              <>
                <Separator />
                <div className={`flex items-start gap-3 p-3 rounded-lg ${
                  amountDifference > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                    amountDifference > 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {amountDifference > 0 ? 'Overpayment' : 'Underpayment'} Detected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Difference: {formatCurrency(Math.abs(amountDifference), order.fiatCurrencyCode)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {!hasDiscrepancy && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Amount matches perfectly</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.payIn.senderName && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Sender Name</span>
              </div>
              <span className="font-medium">{order.payIn.senderName}</span>
            </div>
          )}

          {order.payIn.paymentMethodCode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Payment Method</span>
              </div>
              <Badge variant="outline">{order.payIn.paymentMethodCode}</Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>PayIn ID</span>
            </div>
            <span className="font-mono text-xs">{order.payIn.id}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            PayIn Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-full w-px bg-border" />
              </div>
              <div className="pb-4 flex-1">
                <p className="text-sm font-medium">PayIn Created</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(order.payIn.createdAt)}
                </p>
              </div>
            </div>

            {order.payIn.status !== 'PENDING' && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="h-full w-px bg-border" />
                </div>
                <div className="pb-4 flex-1">
                  <p className="text-sm font-medium">Status: {order.payIn.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.payIn.updatedAt)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <p className="text-sm text-muted-foreground">
                {order.payIn.status === 'RECONCILED' ? 'PayIn completed' : 'Awaiting further action...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

