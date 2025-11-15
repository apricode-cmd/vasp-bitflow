/**
 * Order Quick Stats Component
 * Left panel with key order information
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { 
  Coins, 
  TrendingUp, 
  Wallet, 
  Network,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface OrderQuickStatsProps {
  order: {
    cryptoAmount: number;
    currencyCode: string;
    fiatAmount: number;
    fiatCurrencyCode: string;
    rate: number;
    feePercent: number;
    feeAmount: number;
    totalFiat: number;
    walletAddress: string;
    blockchainCode?: string | null;
    paymentMethodCode?: string | null;
    expiresAt: string;
    blockchain?: {
      name: string;
      explorerUrl: string;
    } | null;
    paymentMethod?: {
      name: string;
    } | null;
    currency: {
      symbol: string;
      name: string;
    };
    fiatCurrency: {
      symbol: string;
    };
  };
}

export function OrderQuickStats({ order }: OrderQuickStatsProps): JSX.Element {
  const isExpired = new Date(order.expiresAt) < new Date();

  const stats = [
    {
      label: 'Crypto Amount',
      value: `${formatCryptoAmount(order.cryptoAmount)} ${order.currencyCode}`,
      icon: Coins,
      description: order.currency.name
    },
    {
      label: 'Exchange Rate',
      value: `${formatCurrency(order.rate, order.fiatCurrencyCode)}`,
      icon: TrendingUp,
      description: `1 ${order.currencyCode} = ${formatCurrency(order.rate, order.fiatCurrencyCode)}`
    },
    {
      label: 'Fiat Amount',
      value: formatCurrency(order.fiatAmount, order.fiatCurrencyCode),
      icon: CreditCard,
      description: 'Before fees'
    },
    {
      label: 'Platform Fee',
      value: `${order.feePercent}% (${formatCurrency(order.feeAmount, order.fiatCurrencyCode)})`,
      icon: TrendingUp,
      description: 'Platform commission'
    },
    {
      label: 'Total to Pay',
      value: formatCurrency(order.totalFiat, order.fiatCurrencyCode),
      icon: CheckCircle,
      description: 'Including all fees',
      highlight: true
    },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Stats Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Amounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`flex items-start justify-between p-3 rounded-lg ${
                stat.highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <stat.icon className={`h-4 w-4 mt-1 ${stat.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`font-semibold ${stat.highlight ? 'text-primary text-lg' : ''}`}>
                    {stat.value}
                  </p>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Wallet & Network Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Destination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span>Wallet Address</span>
            </div>
            <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
              {order.walletAddress}
            </div>
            {order.blockchain && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                asChild
              >
                <a
                  href={`${order.blockchain.explorerUrl}/address/${order.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Network className="h-4 w-4 mr-2" />
                  View in {order.blockchain.name} Explorer
                </a>
              </Button>
            )}
          </div>

          {order.blockchainCode && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Network</span>
              <Badge variant="outline">{order.blockchainCode}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      {order.paymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.paymentMethod.name}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiry Warning */}
      <Card className={isExpired ? 'border-destructive' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {isExpired ? (
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="space-y-1 flex-1">
              <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : ''}`}>
                {isExpired ? 'Order Expired' : 'Expires'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

