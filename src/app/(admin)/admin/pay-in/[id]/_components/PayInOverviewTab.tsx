/**
 * PayIn Overview Tab Component
 * Displays all details of a PayIn transaction
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/formatters';
import { 
  Receipt, 
  User, 
  CreditCard, 
  Network,
  CheckCircle,
  Clock,
  FileText,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PayInOverviewTabProps {
  payIn: {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    expectedAmount: number;
    receivedAmount: number | null;
    amountMismatch: boolean;
    currencyType: string;
    status: string;
    senderName: string | null;
    transactionId: string | null;
    paymentDate: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
    reconciledBy: string | null;
    reconciledAt: string | null;
    verificationNotes: string | null;
    createdAt: string;
    updatedAt: string;
    order: {
      id: string;
      paymentReference: string;
      cryptoAmount: number;
      currencyCode: string;
      status: string;
    };
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      } | null;
    };
    fiatCurrency: {
      code: string;
      name: string;
      symbol: string;
    } | null;
    cryptocurrency: {
      code: string;
      name: string;
      symbol: string;
    } | null;
    paymentMethod: {
      code: string;
      name: string;
    } | null;
    network: {
      code: string;
      name: string;
    } | null;
    verifier: {
      id: string;
      email: string;
    } | null;
    reconciler: {
      id: string;
      email: string;
    } | null;
  };
}

export function PayInOverviewTab({ payIn }: PayInOverviewTabProps): JSX.Element {
  const currency = payIn.currencyType === 'FIAT' ? payIn.fiatCurrency : payIn.cryptocurrency;
  const method = payIn.currencyType === 'FIAT' ? payIn.paymentMethod : payIn.network;

  return (
    <div className="space-y-6">
      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Payment Reference</label>
            <p className="font-mono text-sm mt-1">{payIn.order.paymentReference}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Currency Type</label>
            <p className="mt-1">
              <Badge variant="outline">{payIn.currencyType}</Badge>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Currency</label>
            <p className="mt-1">{currency?.name || 'N/A'} ({currency?.code || 'N/A'})</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Payment Method / Network</label>
            <p className="mt-1">{method?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Expected Amount</label>
            <p className="font-semibold mt-1">
              {currency?.symbol || ''}{payIn.expectedAmount.toFixed(2)} {currency?.code || ''}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Received Amount</label>
            <p className={`font-semibold mt-1 ${payIn.amountMismatch ? 'text-red-600' : ''}`}>
              {payIn.receivedAmount 
                ? `${currency?.symbol || ''}${payIn.receivedAmount.toFixed(2)} ${currency?.code || ''}`
                : 'Not received yet'
              }
              {payIn.amountMismatch && (
                <Badge variant="destructive" className="ml-2">Mismatch</Badge>
              )}
            </p>
          </div>
          {payIn.senderName && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Sender Name</label>
              <p className="mt-1">{payIn.senderName}</p>
            </div>
          )}
          {payIn.transactionId && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
              <p className="font-mono text-sm mt-1">{payIn.transactionId}</p>
            </div>
          )}
          {payIn.paymentDate && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
              <p className="mt-1">{formatDateTime(new Date(payIn.paymentDate))}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Related Order
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Order ID</label>
            <p className="font-mono text-sm mt-1">
              <Link href={`/admin/orders?id=${payIn.order.id}`} className="text-blue-600 hover:underline">
                {payIn.order.id}
              </Link>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Order Status</label>
            <p className="mt-1">
              <Badge>{payIn.order.status}</Badge>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Crypto Amount</label>
            <p className="font-semibold mt-1">
              {payIn.order.cryptoAmount.toFixed(8)} {payIn.order.currencyCode}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <p className="font-mono text-sm mt-1">
              <Link href={`/admin/users/${payIn.user.id}`} className="text-blue-600 hover:underline">
                {payIn.user.id}
              </Link>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1">{payIn.user.email}</p>
          </div>
          {payIn.user.profile && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="mt-1">
                {payIn.user.profile.firstName} {payIn.user.profile.lastName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Information */}
      {(payIn.verifiedBy || payIn.reconciledBy || payIn.verificationNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Verification & Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payIn.verifiedBy && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verified By</label>
                  <p className="mt-1">{payIn.verifier?.email || payIn.verifiedBy}</p>
                </div>
                {payIn.verifiedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Verified At</label>
                    <p className="mt-1">{formatDateTime(new Date(payIn.verifiedAt))}</p>
                  </div>
                )}
              </div>
            )}
            {payIn.reconciledBy && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reconciled By</label>
                  <p className="mt-1">{payIn.reconciler?.email || payIn.reconciledBy}</p>
                </div>
                {payIn.reconciledAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reconciled At</label>
                    <p className="mt-1">{formatDateTime(new Date(payIn.reconciledAt))}</p>
                  </div>
                )}
              </div>
            )}
            {payIn.verificationNotes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Verification Notes</label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {payIn.verificationNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created At</label>
            <p className="mt-1">{formatDateTime(new Date(payIn.createdAt))}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="mt-1">{formatDateTime(new Date(payIn.updatedAt))}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

