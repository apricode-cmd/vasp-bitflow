/**
 * Order Quick Stats Component
 * Left panel with key order information
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { 
  Coins, 
  TrendingUp, 
  Wallet, 
  Network,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingDown,
  Send,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { OrderStatus } from '@prisma/client';

interface OrderQuickStatsProps {
  order: {
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
    payIn?: {
      status: string;
    } | null;
    payOut?: {
      status: string;
    } | null;
  };
}

export function OrderQuickStats({ order }: OrderQuickStatsProps): JSX.Element {
  const isExpired = new Date(order.expiresAt) < new Date();

  // Calculate order flow progress
  const getOrderProgress = (): { progress: number; currentStep: number; steps: Array<{ label: string; icon: any; completed: boolean; active: boolean }> } => {
    const orderFlowSteps = [
      { label: 'Order Created', icon: CheckCircle, key: 'PENDING' },
      { label: 'Payment Received', icon: TrendingDown, key: 'PAYMENT_RECEIVED' },
      { label: 'Processing', icon: Clock, key: 'PROCESSING' },
      { label: 'Crypto Sent', icon: Send, key: 'COMPLETED' },
    ];

    const statusFlow = ['PENDING', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'PROCESSING', 'COMPLETED'];
    const currentIndex = statusFlow.indexOf(order.status);
    
    // Handle terminal statuses
    if (order.status === 'CANCELLED' || order.status === 'FAILED' || order.status === 'EXPIRED') {
      return {
        progress: 0,
        currentStep: 0,
        steps: orderFlowSteps.map(step => ({ ...step, completed: false, active: false }))
      };
    }

    const progress = currentIndex >= 0 ? ((currentIndex + 1) / statusFlow.length) * 100 : 0;

    const steps = orderFlowSteps.map((step, index) => {
      const stepIndex = statusFlow.indexOf(step.key);
      return {
        ...step,
        completed: currentIndex > stepIndex,
        active: currentIndex === stepIndex
      };
    });

    return { progress, currentStep: currentIndex, steps };
  };

  const { progress, steps } = getOrderProgress();

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
      {/* Order Flow Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% Complete
            </p>
          </div>

          <Separator />

          {/* Progress Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  step.active ? 'bg-primary/10' : step.completed ? 'bg-muted/50' : 'opacity-50'
                }`}
              >
                <div className={`rounded-full p-2 ${
                  step.active 
                    ? 'bg-primary text-primary-foreground' 
                    : step.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${step.active ? 'text-primary' : ''}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PayIn/PayOut Status Indicators */}
          {(order.payIn || order.payOut) && (
            <>
              <Separator />
              <div className="space-y-2">
                {order.payIn && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-3.5 w-3.5" />
                      PayIn
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {order.payIn.status}
                    </Badge>
                  </div>
                )}
                {order.payOut && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      PayOut
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {order.payOut.status}
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

