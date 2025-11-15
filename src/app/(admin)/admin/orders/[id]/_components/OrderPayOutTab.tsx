/**
 * Order PayOut Tab
 * Displays outgoing crypto payment details
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDateTime, formatCryptoAmount, formatCurrency } from '@/lib/formatters';
import { 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Wallet,
  Network,
  Hash,
  ExternalLink,
  Plus,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface OrderPayOutTabProps {
  order: {
    id: string;
    cryptoAmount: number;
    currencyCode: string;
    walletAddress: string;
    blockchainCode?: string | null;
    blockchain?: {
      name: string;
      explorerUrl: string;
    } | null;
    payOut?: {
      id: string;
      status: string;
      amount: number;
      currencyType: string;
      fiatCurrencyCode?: string | null;
      cryptocurrencyCode?: string | null;
      transactionHash?: string | null;
      fiatCurrency?: { code: string; name: string; symbol: string } | null;
      cryptocurrency?: { code: string; name: string; symbol: string } | null;
      paymentMethod?: { code: string; name: string } | null;
      network?: { code: string; name: string; explorerUrl?: string } | null;
      createdAt: string;
      updatedAt: string;
    } | null;
  };
  onCreatePayOut?: () => void;
}

const PAYOUT_STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-500',
    description: 'PayOut created, waiting to process'
  },
  QUEUED: {
    label: 'Queued',
    icon: Clock,
    color: 'bg-blue-500',
    description: 'In queue for batch processing'
  },
  PROCESSING: {
    label: 'Processing',
    icon: TrendingUp,
    color: 'bg-blue-600',
    description: 'Transaction being prepared'
  },
  SENT: {
    label: 'Sent',
    icon: Send,
    color: 'bg-purple-500',
    description: 'Transaction broadcast to blockchain'
  },
  CONFIRMING: {
    label: 'Confirming',
    icon: Network,
    color: 'bg-indigo-500',
    description: 'Awaiting blockchain confirmations'
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: CheckCircle,
    color: 'bg-green-500',
    description: 'Transaction confirmed on blockchain'
  },
  FAILED: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'bg-red-500',
    description: 'Transaction failed'
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: AlertCircle,
    color: 'bg-gray-500',
    description: 'PayOut cancelled'
  }
};

export function OrderPayOutTab({ order, onCreatePayOut }: OrderPayOutTabProps): JSX.Element {
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Transaction hash copied to clipboard');
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(order.walletAddress);
    toast.success('Wallet address copied to clipboard');
  };

  if (!order.payOut) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No PayOut Record</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This order doesn't have an associated PayOut record yet. Create one to send crypto to the customer.
            </p>
          </div>
          <Button onClick={onCreatePayOut}>
            <Plus className="h-4 w-4 mr-2" />
            Create PayOut Record
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = PAYOUT_STATUS_CONFIG[order.payOut.status as keyof typeof PAYOUT_STATUS_CONFIG] || PAYOUT_STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const amountDifference = order.payOut.amount - order.cryptoAmount;
  const hasDiscrepancy = Math.abs(amountDifference) > 0.00000001;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            PayOut Status
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
                <Badge variant="outline">{order.payOut.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium">{formatDateTime(order.payOut.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm font-medium">{formatDateTime(order.payOut.updatedAt)}</p>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href={`/admin/pay-out/${order.payOut.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full PayOut Details
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Amount Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Crypto Amount
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Order Amount</span>
              <span className="font-semibold">
                {formatCryptoAmount(order.cryptoAmount)} {order.currencyCode}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">PayOut Amount</span>
              <span className="font-semibold">
                {order.payOut.currencyType === 'FIAT' && order.payOut.fiatCurrency
                  ? formatCurrency(order.payOut.amount, order.payOut.fiatCurrency.code)
                  : order.payOut.cryptocurrency
                  ? `${formatCryptoAmount(order.payOut.amount)} ${order.payOut.cryptocurrency.code}`
                  : `${formatCryptoAmount(order.payOut.amount)}`}
              </span>
            </div>

            {hasDiscrepancy ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-orange-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900">Amount Discrepancy</p>
                  <p className="text-xs text-orange-700">
                    Difference: {formatCryptoAmount(Math.abs(amountDifference))} {order.currencyCode}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Amount matches perfectly</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Destination Wallet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Destination Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wallet Address</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
              {order.walletAddress}
            </div>
          </div>

          {order.blockchain && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <Badge variant="outline">{order.blockchain.name}</Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <a
                  href={`${order.blockchain.explorerUrl}/address/${order.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Block Explorer
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Hash */}
      {order.payOut.transactionHash && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Transaction Hash
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">TX Hash</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyHash(order.payOut!.transactionHash!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
                {order.payOut.transactionHash}
              </div>
            </div>

            {order.blockchain && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <a
                  href={`${order.blockchain.explorerUrl}/tx/${order.payOut.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Transaction in Explorer
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* PayOut Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            PayOut Timeline
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
                <p className="text-sm font-medium">PayOut Created</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(order.payOut.createdAt)}
                </p>
              </div>
            </div>

            {order.payOut.status !== 'PENDING' && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {order.payOut.transactionHash && <div className="h-full w-px bg-border" />}
                </div>
                <div className="pb-4 flex-1">
                  <p className="text-sm font-medium">Status: {order.payOut.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.payOut.updatedAt)}
                  </p>
                </div>
              </div>
            )}

            {order.payOut.transactionHash && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="pb-4 flex-1">
                  <p className="text-sm font-medium">Transaction Broadcast</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {order.payOut.transactionHash}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <p className="text-sm text-muted-foreground">
                {order.payOut.status === 'CONFIRMED' ? 'PayOut completed' : 'Awaiting further confirmations...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

