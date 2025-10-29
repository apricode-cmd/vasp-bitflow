/**
 * Order Detail Page
 * 
 * Detailed view of a specific order with payment information.
 */

import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import { CurrencyIcon } from '@/components/features/CurrencyIcon';
import { formatDateTime, formatFiatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps): Promise<React.ReactElement> {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Await params
  const { id } = await params;

  // Get order details
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      currency: true,
      fiatCurrency: true,
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  // Verify ownership
  if (order.userId !== session.user.id) {
    redirect('/orders');
  }

  // Get bank details for the fiat currency (DEPRECATED - will use PaymentAccount)
  const bankDetails = await prisma.bankDetails.findFirst({
    where: {
      currency: order.fiatCurrencyCode,
      isActive: true
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/orders">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <CurrencyIcon currency={order.currencyCode as 'BTC' | 'ETH' | 'USDT' | 'SOL'} size={48} />
          <div>
            <h1 className="text-3xl font-bold">
              {formatCryptoAmount(order.cryptoAmount, order.currency?.decimals || 8)} {order.currencyCode}
            </h1>
            <p className="text-muted-foreground mt-1">
              Order #{order.paymentReference} • {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Status Messages */}
      {order.status === 'PENDING' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900">Payment Required</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  Please transfer the funds using the bank details below and upload payment proof.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.status === 'PROCESSING' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900">Payment Received</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Your payment has been received and is being processed. Crypto will be sent shortly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.status === 'COMPLETED' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900">Order Completed</h3>
                <p className="text-sm text-green-800 mt-1">
                  Cryptocurrency has been sent to your wallet address.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cryptocurrency:</span>
              <span className="font-medium">{order.currency.name} ({order.currencyCode})</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCryptoAmount(order.cryptoAmount, order.currency?.decimals || 8)} {order.currencyCode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate:</span>
              <span className="font-medium">1 {order.currencyCode} = {formatFiatCurrency(order.rate, order.fiatCurrencyCode)}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatFiatCurrency(order.fiatAmount, order.fiatCurrencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span className="font-medium">{formatFiatCurrency(order.feeAmount, order.fiatCurrencyCode)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total to Pay:</span>
                <span className="text-primary">{formatFiatCurrency(order.totalFiat, order.fiatCurrencyCode)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Information */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Wallet Address:</span>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                  {order.walletAddress}
                </code>
                <CopyButton text={order.walletAddress} />
              </div>
            </div>

            {order.transactionHash && (
              <div>
                <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                    {order.transactionHash}
                  </code>
                  <CopyButton text={order.transactionHash} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bank Details (for pending orders) */}
      {order.status === 'PENDING' && bankDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Instructions</CardTitle>
            <CardDescription>
              Transfer {formatFiatCurrency(order.totalFiat, order.fiatCurrencyCode)} to the following bank account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Bank Name:</span>
                <p className="font-medium">{bankDetails.bankName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Account Holder:</span>
                <p className="font-medium">{bankDetails.accountHolder}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">IBAN:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm">{bankDetails.iban}</code>
                  <CopyButton text={bankDetails.iban} variant="ghost" size="sm" />
                </div>
              </div>
              {bankDetails.swift && (
                <div>
                  <span className="text-sm text-muted-foreground">SWIFT/BIC:</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{bankDetails.swift}</code>
                    <CopyButton text={bankDetails.swift} variant="ghost" size="sm" />
                  </div>
                </div>
              )}
            </div>

            {bankDetails.instructions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Important:</h4>
                <p className="text-sm text-blue-800">{bankDetails.instructions.replace('{orderId}', order.paymentReference)}</p>
                <p className="text-sm text-blue-800 mt-2">
                  Payment Reference: <strong>{order.paymentReference}</strong>
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button size="lg" className="w-full" disabled>
                Upload Payment Proof (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

