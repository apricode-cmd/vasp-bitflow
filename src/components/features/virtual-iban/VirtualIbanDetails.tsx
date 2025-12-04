/**
 * Virtual IBAN Details Component
 * 
 * Neo-bank style account details UI
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  XCircle,
  Check,
  Share2,
  Clock,
  Receipt,
  Link2,
  Download,
  Wifi
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { VirtualIbanAccount, VirtualIbanTransaction, VirtualIbanStatus, TopUpRequest } from './types';
import { TopUpModal } from './TopUpModal';
import { CloseAccountDialog } from './CloseAccountDialog';

interface VirtualIbanDetailsProps {
  account: VirtualIbanAccount;
  transactions: VirtualIbanTransaction[];
  topUpRequests: TopUpRequest[];
  refreshing: boolean;
  onRefresh: () => void;
}

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
    case 'ACTIVE': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'SUSPENDED': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'CLOSED': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    case 'FAILED': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-600';
  }
}

function maskIban(iban: string): string {
  if (!iban || iban.length < 8) return iban || '';
  return `${iban.substring(0, 4)}  ••••  ••••  ${iban.substring(iban.length - 4)}`;
}

function formatIban(iban: string): string {
  if (!iban) return '';
  return iban.replace(/(.{4})/g, '$1  ').trim();
}

// Copy button with feedback
function CopyButton({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button 
      variant="ghost" 
      size="icon"
      className={`h-8 w-8 hover:bg-primary/10 ${className}`}
      onClick={handleCopy}
      disabled={!value}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

// Account detail row
function DetailRow({ label, value, copyable = false, mono = false }: { 
  label: string; 
  value: string; 
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>
          {value || '-'}
        </span>
        {copyable && value && <CopyButton value={value} label={label} />}
      </div>
    </div>
  );
}

export function VirtualIbanDetails({ 
  account, 
  transactions,
  topUpRequests, 
  refreshing, 
  onRefresh 
}: VirtualIbanDetailsProps): JSX.Element {
  const [showIban, setShowIban] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const isAccountClosed = account.status === 'CLOSED';

  const handleShareDetails = () => {
    const details = `IBAN: ${account.iban}\nBIC: ${account.bic}\nBank: ${account.bankName}\nHolder: ${account.accountHolder}`;
    navigator.clipboard.writeText(details);
    toast.success('Account details copied');
  };

  const handleDownloadInvoice = async (requestId: string, reference: string) => {
    try {
      toast.loading('Generating invoice...', { id: 'invoice' });
      const response = await fetch(`/api/client/virtual-iban/${account.id}/topup/${requestId}/invoice`);
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded', { id: 'invoice' });
    } catch (error) {
      console.error('Download invoice error:', error);
      toast.error('Failed to download invoice', { id: 'invoice' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Virtual IBAN</h1>
              <Badge variant="outline" className={getStatusColor(account.status)}>
                {account.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{account.currency} Account</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {!isAccountClosed && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCloseDialogOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Closed Alert */}
      {isAccountClosed && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            This account has been closed and can no longer receive payments.
          </AlertDescription>
        </Alert>
      )}

      {/* Balance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-4xl font-bold tracking-tight">
                {formatCurrency(account.balance || 0, account.currency)}
              </p>
              {account.lastBalanceUpdate && (
                <p className="text-xs text-muted-foreground mt-2">
                  Updated {formatDateTime(account.lastBalanceUpdate)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setTopUpModalOpen(true)} disabled={isAccountClosed}>
                <Banknote className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button variant="outline" asChild disabled={isAccountClosed}>
                <Link href="/buy">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buy Crypto
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Bank Card Visual - high contrast for both themes */}
          <div className="relative overflow-hidden bg-slate-900 dark:bg-slate-800 p-5">
            {/* Background Pattern */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/20 translate-x-10 -translate-y-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-primary/10 -translate-x-8 translate-y-8" />
            </div>
            
            {/* Card Header */}
            <div className="relative flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                  <Landmark className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Virtual Account</p>
                  <p className="text-white font-medium text-sm">{account.bankName}</p>
                </div>
              </div>
              <Wifi className="h-5 w-5 text-slate-500 rotate-90" />
            </div>
            
            {/* IBAN Display */}
            <div className="relative mb-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest">IBAN</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={() => setShowIban(!showIban)}
                >
                  {showIban ? <><EyeOff className="h-3 w-3 mr-1" />Hide</> : <><Eye className="h-3 w-3 mr-1" />Show</>}
                </Button>
              </div>
              <p className="font-mono text-white text-lg tracking-[0.2em]">
                {showIban ? formatIban(account.iban) : maskIban(account.iban)}
              </p>
            </div>
            
            {/* Bottom Info */}
            <div className="relative grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Account Holder</p>
                <p className="text-white text-sm font-medium truncate">{account.accountHolder}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">BIC/SWIFT</p>
                <p className="text-white font-mono text-sm">{account.bic}</p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-4 gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-col h-auto py-3 gap-1 hover:bg-muted"
                onClick={() => {
                  navigator.clipboard.writeText(account.iban);
                  toast.success('IBAN copied');
                }}
              >
                <Copy className="h-4 w-4" />
                <span className="text-[10px]">Copy IBAN</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-col h-auto py-3 gap-1 hover:bg-muted"
                onClick={() => {
                  navigator.clipboard.writeText(account.bic || '');
                  toast.success('BIC copied');
                }}
              >
                <Copy className="h-4 w-4" />
                <span className="text-[10px]">Copy BIC</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-col h-auto py-3 gap-1 hover:bg-muted"
                onClick={handleShareDetails}
              >
                <Share2 className="h-4 w-4" />
                <span className="text-[10px]">Share</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-col h-auto py-3 gap-1 hover:bg-muted"
                onClick={() => setShowIban(!showIban)}
              >
                {showIban ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="text-[10px]">{showIban ? 'Hide' : 'Show'}</span>
              </Button>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</p>
                <p className="font-semibold text-sm mt-1">{account.currency}</p>
              </div>
              <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bank Country</p>
                <p className="font-semibold text-sm mt-1">{account.country || '-'}</p>
              </div>
              <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="font-semibold text-sm mt-1 text-green-600 dark:text-green-400">{account.status}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium mb-1">How to deposit funds</p>
              <p className="text-muted-foreground">
                Send a SEPA transfer to your IBAN from any EU bank. Funds usually arrive within 1 business day and your balance updates automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Balance */}
      {!isAccountClosed && (account.balance || 0) < 10 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Low balance. Deposit funds for instant crypto purchases.
          </AlertDescription>
        </Alert>
      )}

      {/* Deposit Requests */}
      {topUpRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Deposit Requests
            </CardTitle>
            <CardDescription>
              {topUpRequests.filter(r => r.status === 'PENDING').length} pending • Click to download invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topUpRequests.slice(0, 5).map((req) => {
                const isPending = req.status === 'PENDING';
                const isExpired = isPending && new Date(req.expiresAt) < new Date();
                const isCompleted = req.status === 'COMPLETED';
                
                return (
                  <div 
                    key={req.id} 
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleDownloadInvoice(req.id, req.reference)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-green-500/10' 
                          : isExpired 
                            ? 'bg-orange-500/10'
                            : isPending
                              ? 'bg-blue-500/10'
                              : 'bg-gray-500/10'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : isExpired ? (
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                        ) : isPending ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium font-mono">
                          {req.invoiceNumber || req.reference}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(req.createdAt)}
                          {isPending && !isExpired && (
                            <span className="ml-2">• Expires {formatDateTime(req.expiresAt)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(req.amount, req.currency)}
                        </p>
                        <div className="flex items-center gap-2 justify-end">
                          <Badge 
                            variant="outline" 
                            className={`text-xs h-5 ${
                              isCompleted 
                                ? 'border-green-500/30 text-green-600' 
                                : isExpired 
                                  ? 'border-orange-500/30 text-orange-600'
                                  : isPending
                                    ? 'border-blue-500/30 text-blue-600'
                                    : ''
                            }`}
                          >
                            {isExpired ? 'Expired' : req.status}
                          </Badge>
                          {req.transaction && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              Matched
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadInvoice(req.id, req.reference);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">No transactions yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Make your first deposit to get started
              </p>
              <Button size="sm" onClick={() => setTopUpModalOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Invoice
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                      tx.type === 'CREDIT' 
                        ? 'bg-green-500/10' 
                        : 'bg-red-500/10'
                    }`}>
                      {tx.type === 'CREDIT' ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.type === 'CREDIT' ? 'Deposit' : 'Payment'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(tx.processedAt)}
                        {tx.senderName && ` • ${tx.senderName}`}
                      </p>
                    </div>
                  </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency || tx.currencyCode || 'EUR')}
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant="outline" className="text-xs h-5">
                          {tx.status}
                        </Badge>
                        {tx.topUpRequest && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            Invoice
                          </span>
                        )}
                        {tx.orderId && (
                          <Link 
                            href={`/orders/${tx.orderId}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Order →
                          </Link>
                        )}
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TopUpModal 
        open={topUpModalOpen} 
        onOpenChange={setTopUpModalOpen} 
        account={account} 
      />

      <CloseAccountDialog
        accountId={account.id}
        iban={account.iban}
        balance={account.balance || 0}
        currency={account.currency}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onSuccess={() => {
          onRefresh();
          toast.success('Account closed successfully');
          setTimeout(() => window.location.reload(), 2000);
        }}
      />
    </div>
  );
}
