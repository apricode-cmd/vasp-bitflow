/**
 * Client Payment Details Page
 * 
 * Страница с IBAN для оплаты заказов
 * Показывает Virtual IBAN клиента и историю транзакций
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  Copy, 
  Download, 
  Landmark, 
  ArrowDownToLine, 
  CheckCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function PaymentDetailsPage(): JSX.Element {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions(selectedAccount.id);
      
      // Start polling if account is PENDING
      if (selectedAccount.status === 'PENDING') {
        startPolling();
      } else {
        stopPolling();
      }
    }
    
    return () => {
      stopPolling();
    };
  }, [selectedAccount]);

  const startPolling = () => {
    // Poll every 5 seconds
    if (pollingIntervalRef.current) return; // Already polling
    
    console.log('[PaymentDetails] Starting auto-poll for PENDING account');
    pollingIntervalRef.current = setInterval(() => {
      fetchAccounts(); // Silent refresh
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('[PaymentDetails] Stopping auto-poll');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const fetchAccounts = async (): Promise<void> => {
    try {
      const response = await fetch('/api/client/virtual-iban');
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        setAccounts(data.data);
        
        // Update selected account if it exists
        if (selectedAccount) {
          const updated = data.data.find((acc: any) => acc.id === selectedAccount.id);
          if (updated) {
            setSelectedAccount(updated);
            
            // Stop polling if account became ACTIVE
            if (updated.status !== 'PENDING' && selectedAccount.status === 'PENDING') {
              stopPolling();
              toast.success('Your IBAN is now ready!');
            }
          }
        } else {
          setSelectedAccount(data.data[0]); // Select first account
        }
      }
    } catch (error) {
      console.error('Fetch accounts error:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await fetchAccounts();
      toast.success('Payment details refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchTransactions = async (accountId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/client/virtual-iban/${accountId}`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data.transactions.map((tx: any) => ({
          ...tx,
          createdAt: new Date(tx.createdAt),
          processedAt: tx.processedAt ? new Date(tx.processedAt) : null,
        })));
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
    }
  };

  const copyIban = () => {
    if (selectedAccount) {
      navigator.clipboard.writeText(selectedAccount.iban);
      toast.success('IBAN copied to clipboard');
    }
  };

  const copyBic = () => {
    if (selectedAccount?.bic) {
      navigator.clipboard.writeText(selectedAccount.bic);
      toast.success('BIC copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Payment Account Yet</h3>
            <p className="text-muted-foreground">
              Contact support to activate your personal payment account
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Landmark className="h-8 w-8" />
            Payment Details
          </h1>
          <p className="text-muted-foreground">
            Your personal bank account for payments
          </p>
        </div>
        
        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* PENDING Alert */}
      {selectedAccount.status === 'PENDING' && (
        <Alert className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-spin flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Your account is being created
              </h4>
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                We're setting up your personal IBAN. This usually takes 1-2 minutes.
                You'll be notified once it's ready. This page will update automatically.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* IBAN Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Your Personal IBAN
          </CardTitle>
          <CardDescription>
            Use this IBAN to make bank transfers for your orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* IBAN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">IBAN</label>
              {selectedAccount.status !== 'PENDING' && (
                <Button variant="ghost" size="sm" onClick={copyIban}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              selectedAccount.status === 'PENDING' 
                ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900' 
                : 'bg-muted'
            }`}>
              {selectedAccount.status === 'PENDING' ? (
                <div className="flex items-center gap-2 flex-1">
                  <Loader2 className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-spin" />
                  <span className="text-lg font-medium text-orange-900 dark:text-orange-100">
                    Creating your IBAN...
                  </span>
                </div>
              ) : (
                <code className="text-lg font-mono font-semibold flex-1">
                  {selectedAccount.iban}
                </code>
              )}
            </div>
          </div>

          {/* BIC */}
          {selectedAccount.bic && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">BIC/SWIFT</label>
                <Button variant="ghost" size="sm" onClick={copyBic}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <code className="text-lg font-mono font-semibold flex-1">
                  {selectedAccount.bic}
                </code>
              </div>
            </div>
          )}

          {/* Bank Details */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
              <p className="font-medium">{selectedAccount.bankName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Account Holder</p>
              <p className="font-medium">{selectedAccount.accountHolder}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Currency</p>
              <Badge variant="secondary">{selectedAccount.currency}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Country</p>
              <p className="font-medium">{selectedAccount.country}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Payment Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Use the IBAN above for your bank transfer</li>
              <li>Include your <strong>Order Reference</strong> in the payment description</li>
              <li>Payment usually processes within 1-2 business days</li>
              <li>You'll receive email confirmation once payment is received</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Your recent payments ({transactions.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Your payments will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(tx.processedAt || tx.createdAt)}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      +{formatCurrency(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell>
                      {tx.reference ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {tx.reference}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.orderId ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Matched
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Processing
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}





