/**
 * Order Overview Tab
 * Main overview with order summary and quick actions
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDateTime, formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  User,
  Coins,
  Calendar,
  FileText,
  TrendingUp
} from 'lucide-react';
import type { OrderStatus } from '@prisma/client';

interface OrderOverviewTabProps {
  order: {
    id: string;
    paymentReference: string;
    status: OrderStatus;
    cryptoAmount: number;
    currencyCode: string;
    fiatAmount: number;
    fiatCurrencyCode: string;
    rate: number;
    feePercent: number;
    feeAmount: number;
    totalFiat: number;
    walletAddress: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    createdByAdmin: boolean;
    adminNotes?: string | null;
    transactionHash?: string | null;
    processedAt?: string | null;
    processedBy?: string | null;
    user: {
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      } | null;
    };
    currency: {
      symbol: string;
      name: string;
    };
    fiatCurrency: {
      symbol: string;
    };
    payIn?: {
      id: string;
      status: string;
      amount: number;
      currencyCode: string;
    } | null;
    payOut?: {
      id: string;
      status: string;
      amount: number;
      currencyCode: string;
    } | null;
  };
}

export function OrderOverviewTab({ order }: OrderOverviewTabProps): JSX.Element {
  const StatusIcon = {
    PENDING: Clock,
    PAYMENT_PENDING: Clock,
    PAYMENT_RECEIVED: CheckCircle,
    PROCESSING: TrendingUp,
    COMPLETED: CheckCircle,
    CANCELLED: XCircle,
    FAILED: AlertCircle,
    EXPIRED: AlertCircle,
  }[order.status] || AlertCircle;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Status</span>
            <Badge className="text-sm">{order.status}</Badge>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm font-medium">{formatDateTime(order.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expires At</p>
              <p className="text-sm font-medium">{formatDateTime(order.expiresAt)}</p>
            </div>
            {order.processedAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Processed</p>
                <p className="text-sm font-medium">{formatDateTime(order.processedAt)}</p>
              </div>
            )}
          </div>

          {order.createdByAdmin && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Created by admin</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crypto Amount</span>
              <span className="font-medium">
                {formatCryptoAmount(order.cryptoAmount)} {order.currency.symbol}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Exchange Rate</span>
              <span className="font-medium">
                {formatCurrency(order.rate, order.fiatCurrencyCode)}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fiat Amount</span>
              <span className="font-medium">
                {formatCurrency(order.fiatAmount, order.fiatCurrencyCode)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Fee ({order.feePercent}%)
              </span>
              <span className="font-medium">
                {formatCurrency(order.feeAmount, order.fiatCurrencyCode)}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">
                {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Transactions */}
      {(order.payIn || order.payOut) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Related Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.payIn && (
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PayIn (Incoming Payment)</span>
                  <Badge variant="outline">{order.payIn.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>{order.payIn.amount} {order.payIn.currencyType === 'FIAT' ? order.payIn.fiatCurrencyCode : order.payIn.cryptocurrencyCode}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={`/admin/pay-in/${order.payIn.id}`}>View PayIn Details</a>
                </Button>
              </div>
            )}

            {order.payOut && (
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PayOut (Crypto Sent)</span>
                  <Badge variant="outline">{order.payOut.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>{order.payOut.amount} {order.payOut.currencyType === 'FIAT' ? order.payOut.fiatCurrencyCode : order.payOut.cryptocurrencyCode}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={`/admin/pay-out/${order.payOut.id}`}>View PayOut Details</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Hash */}
      {order.transactionHash && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaction Hash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
              {order.transactionHash}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes */}
      {order.adminNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.adminNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

