/**
 * Virtual IBAN Details Component
 * 
 * Shows account details, balance, top-up instructions, and transactions
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Landmark, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  EyeOff,
  RefreshCw,
  CreditCard,
  Banknote,
  FileText,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { VirtualIbanAccount, VirtualIbanTransaction, VirtualIbanStatus } from './types';
import { TopUpModal } from './TopUpModal';
import { CloseAccountDialog } from './CloseAccountDialog';

interface VirtualIbanDetailsProps {
  account: VirtualIbanAccount;
  transactions: VirtualIbanTransaction[];
  refreshing: boolean;
  onRefresh: () => void;
}

/**
 * Format currency safely
 */
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format datetime safely
 */
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function getStatusColor(status: VirtualIbanStatus): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'SUSPENDED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    case 'FAILED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function maskIban(iban: string): string {
  if (!iban || iban.length < 8) return iban || '';
  return `${iban.substring(0, 4)} ${'*'.repeat(12)} ${iban.substring(iban.length - 4)}`;
}

export function VirtualIbanDetails({ 
  account, 
  transactions, 
  refreshing, 
  onRefresh 
}: VirtualIbanDetailsProps): JSX.Element {
  const [showFullIban, setShowFullIban] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const handleCopyIban = (): void => {
    if (!account.iban) return;
    navigator.clipboard.writeText(account.iban);
    toast.success('IBAN copied to clipboard!');
  };

  const handleCopyBic = (): void => {
    if (!account.bic) return;
    navigator.clipboard.writeText(account.bic);
    toast.success('BIC copied to clipboard!');
  };

  const isAccountClosed = account.status === 'CLOSED';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Virtual IBAN Account</h1>
            <p className="text-muted-foreground">Your personal bank account for crypto purchases</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(account.status)}>
            {account.status}
          </Badge>
          {!isAccountClosed && (
            <>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" />
                Close
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Closed Account Alert */}
      {isAccountClosed && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Account Closed</p>
            <p className="text-sm mt-1">
              This Virtual IBAN account has been closed and can no longer receive payments.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-5xl font-bold text-primary">
                {formatCurrency(account.balance || 0, account.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated: {formatDateTime(account.lastBalanceUpdate)}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setTopUpModalOpen(true)} disabled={isAccountClosed}>
                <FileText className="h-4 w-4 mr-2" />
                Top Up Balance
              </Button>
              <Button size="lg" variant="outline" asChild disabled={isAccountClosed}>
                <Link href="/buy">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buy Crypto
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-up">Top-up Instructions</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Account Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullIban(!showFullIban)}
                >
                  {showFullIban ? (
                    <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-1" /> Show</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IBAN */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">IBAN</p>
                  <p className="font-mono text-lg font-bold">
                    {showFullIban ? account.iban : maskIban(account.iban)}
                  </p>
                </div>
                <Button variant="outline" onClick={handleCopyIban}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>

              {/* BIC */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">BIC/SWIFT</p>
                  <p className="font-mono text-lg font-bold">{account.bic || '-'}</p>
                </div>
                <Button variant="outline" onClick={handleCopyBic} disabled={!account.bic}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Bank Name</p>
                  <p className="text-sm font-semibold">{account.bankName || '-'}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Account Holder</p>
                  <p className="text-sm font-semibold">{account.accountHolder || '-'}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Currency</p>
                  <p className="text-sm font-semibold">{account.currency}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Country</p>
                  <p className="text-sm font-semibold">{account.country}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top-up Tab */}
        <TabsContent value="top-up" id="top-up" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How to Top Up Your Balance</CardTitle>
              <CardDescription>Transfer money from any EU bank account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Banknote className="h-4 w-4" />
                <AlertDescription>
                  Make a SEPA transfer to your Virtual IBAN below. Your balance will update automatically when payment arrives (usually within 1 business day).
                </AlertDescription>
              </Alert>

              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border-2 border-dashed">
                <h3 className="font-semibold text-center mb-4">Bank Transfer Details</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Recipient IBAN</p>
                      <p className="font-mono font-bold">{account.iban}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCopyIban}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                      <p className="font-mono font-bold">{account.bic || '-'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCopyBic} disabled={!account.bic}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Recipient Name</p>
                    <p className="font-bold">{account.accountHolder}</p>
                  </div>

                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Bank Name</p>
                    <p className="font-bold">{account.bankName}</p>
                  </div>

                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Payment Reference (Optional)</p>
                    <p className="font-mono text-sm">Your email or &quot;TOPUP&quot;</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>SEPA transfers: 1 business day</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Automatic balance update via webhook</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Zero fees for top-ups</span>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Important:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Only SEPA/SWIFT transfers from your verified bank account</li>
                    <li>Currency must be {account.currency}</li>
                    <li>Minimum: €1, Maximum: €999,999</li>
                    <li>Balance updates automatically (no manual action needed)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Banknote className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No transactions yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Top up your balance to see transaction history
                  </p>
                  <Button onClick={() => setTopUpModalOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Top Up Now
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(tx.processedAt)}
                        </TableCell>
                        <TableCell>
                          {tx.type === 'CREDIT' ? (
                            <div className="flex items-center gap-2">
                              <ArrowDownCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-700 dark:text-green-400 font-medium">
                                Top-up
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ArrowUpCircle className="h-4 w-4 text-red-600" />
                              <span className="text-red-700 dark:text-red-400 font-medium">
                                Payment
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.description || '-'}
                          {tx.senderName && (
                            <span className="block text-xs text-muted-foreground">
                              From: {tx.senderName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {tx.reference || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={tx.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                            {tx.type === 'CREDIT' ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.currencyCode)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'COMPLETED' ? 'default' : 'outline'}>
                            {tx.status}
                          </Badge>
                          {tx.orderId && (
                            <Link 
                              href={`/orders/${tx.orderId}`}
                              className="block text-xs text-primary hover:underline mt-1"
                            >
                              View Order
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Low Balance Warning */}
      {!isAccountClosed && (account.balance || 0) < 10 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Low Balance</p>
            <p className="text-sm">
              Your Virtual IBAN balance is low. Top up to make instant crypto purchases without waiting for bank transfers.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Top Up Modal */}
      <TopUpModal 
        open={topUpModalOpen} 
        onOpenChange={setTopUpModalOpen} 
        account={account} 
      />

      {/* Close Account Dialog */}
      <CloseAccountDialog
        accountId={account.id}
        iban={account.iban}
        balance={account.balance || 0}
        currency={account.currency}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onSuccess={() => {
          onRefresh();
          toast.success('Account closed successfully. Redirecting...');
          setTimeout(() => window.location.reload(), 2000);
        }}
      />
    </div>
  );
}

