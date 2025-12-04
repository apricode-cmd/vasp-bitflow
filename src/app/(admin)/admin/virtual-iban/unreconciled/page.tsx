/**
 * Unreconciled Transactions Page
 * 
 * Страница с несверенными транзакциями для ручной сверки админом
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Clock, Link2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function UnreconciledTransactionsPage(): JSX.Element {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUnreconciledTransactions();
  }, []);

  const fetchUnreconciledTransactions = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/virtual-iban/unreconciled');
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data.map((tx: any) => ({
          ...tx,
          createdAt: new Date(tx.createdAt),
          processedAt: tx.processedAt ? new Date(tx.processedAt) : null,
        })));
      } else {
        toast.error('Failed to fetch unreconciled transactions');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch unreconciled transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const runBatchReconciliation = async (): Promise<void> => {
    const toastId = toast.loading('Running batch reconciliation...');
    try {
      const response = await fetch('/api/admin/virtual-iban/reconcile?batch=true', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success(
          `Reconciliation complete: ${data.data.reconciled}/${data.data.total} matched`,
          { id: toastId }
        );
        fetchUnreconciledTransactions();
      } else {
        toast.error('Batch reconciliation failed', { id: toastId });
      }
    } catch (error) {
      toast.error('Batch reconciliation failed', { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/virtual-iban">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Virtual IBANs
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="w-8 h-8" />
            Unreconciled Transactions
          </h1>
          <p className="text-muted-foreground">
            Transactions that need manual reconciliation with orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchUnreconciledTransactions} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={runBatchReconciliation}>
            <Link2 className="h-4 w-4 mr-2" />
            Run Batch Reconciliation
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              🎉 No unreconciled transactions! All payments have been matched with orders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {transactions.length} Unreconciled Transaction{transactions.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Link href={`/admin/users/${tx.virtualIban.userId}`}>
                        <div className="hover:underline">
                          <p className="font-medium">
                            {tx.virtualIban.user.profile 
                              ? `${tx.virtualIban.user.profile.firstName} ${tx.virtualIban.user.profile.lastName}`
                              : 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">{tx.virtualIban.user.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {tx.virtualIban.iban}
                      </code>
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      +{formatCurrency(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{tx.senderName || 'Unknown'}</p>
                        {tx.senderIban && (
                          <code className="text-xs text-muted-foreground">{tx.senderIban}</code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.reference ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">{tx.reference}</code>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(tx.processedAt || tx.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/virtual-iban/${tx.virtualIban.id}?reconcile=${tx.id}`}>
                        <Button variant="outline" size="sm">
                          Manual Reconcile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}





