/**
 * Admin VOP Review Page
 * /admin/virtual-iban/vop-review
 * 
 * Lists all transactions awaiting VOP (Verification of Payee) review
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Clock, User, Banknote } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, formatCurrency } from '@/lib/formatters';

interface VopTransaction {
  id: string;
  virtualIbanId: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  senderName: string | null;
  senderIban: string | null;
  reference: string | null;
  vopStatus: 'CLOSE_MATCH' | 'NO_MATCH' | 'IMPOSSIBLE_MATCH';
  vopMatchedName: string | null;
  status: string;
  createdAt: string;
  virtualIban: {
    iban: string;
    accountHolder: string;
    user: {
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
}

export default function VopReviewPage(): JSX.Element {
  const [transactions, setTransactions] = useState<VopTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVopTransactions();
  }, []);

  const fetchVopTransactions = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/virtual-iban/vop/pending');
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data);
      } else {
        toast.error('Failed to load VOP transactions');
      }
    } catch (error) {
      console.error('Fetch VOP transactions error:', error);
      toast.error('Failed to load VOP transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId: string): Promise<void> => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(`/api/admin/virtual-iban/vop/${transactionId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('VOP approved - transaction will be processed');
        fetchVopTransactions();
      } else {
        toast.error(data.error || 'Failed to approve VOP');
      }
    } catch (error) {
      console.error('Approve VOP error:', error);
      toast.error('Failed to approve VOP');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (transactionId: string): Promise<void> => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(`/api/admin/virtual-iban/vop/${transactionId}/reject`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('VOP rejected - payment will be returned');
        fetchVopTransactions();
      } else {
        toast.error(data.error || 'Failed to reject VOP');
      }
    } catch (error) {
      console.error('Reject VOP error:', error);
      toast.error('Failed to reject VOP');
    } finally {
      setProcessingId(null);
    }
  };

  const getVopBadge = (status: VopTransaction['vopStatus']) => {
    switch (status) {
      case 'CLOSE_MATCH':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Close Match</Badge>;
      case 'NO_MATCH':
        return <Badge variant="outline" className="bg-red-100 text-red-800">No Match</Badge>;
      case 'IMPOSSIBLE_MATCH':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Impossible Match</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">VOP Review</h1>
        <p className="text-muted-foreground">Verification of Payee - Review transactions awaiting approval</p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Verification of Payee (VOP)</p>
          <p className="text-sm">
            For EUR SEPA payments, BCB checks if the sender's name matches the account holder. 
            Transactions with close matches, no matches, or impossible matches require manual review.
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            <li><strong>Close Match:</strong> Name is similar (e.g. "John Doe" vs "J. Doe") - usually approve</li>
            <li><strong>No Match:</strong> Names don't match - verify with user before approving</li>
            <li><strong>Impossible Match:</strong> VOP check failed - investigate</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">Transactions awaiting VOP review</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending VOP Transactions</CardTitle>
          <CardDescription>Review and approve/reject transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No transactions pending VOP review</h3>
              <p className="text-sm text-muted-foreground">All payments have been processed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Expected Recipient</TableHead>
                  <TableHead>VOP Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const userName = tx.virtualIban.user.profile
                    ? `${tx.virtualIban.user.profile.firstName} ${tx.virtualIban.user.profile.lastName}`
                    : tx.virtualIban.user.email;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(tx.createdAt)}
                        <div className="text-xs text-muted-foreground font-mono">
                          {tx.providerTransactionId.substring(0, 12)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {formatCurrency(tx.amount, tx.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">{tx.reference || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tx.senderName || 'Unknown'}</div>
                        {tx.senderIban && (
                          <div className="text-xs text-muted-foreground font-mono">{tx.senderIban}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tx.virtualIban.accountHolder}</div>
                        {tx.vopMatchedName && tx.vopStatus === 'CLOSE_MATCH' && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            ✓ Suggested: {tx.vopMatchedName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getVopBadge(tx.vopStatus)}
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/admin/virtual-iban/${tx.virtualIbanId}`}
                          className="text-primary hover:underline"
                        >
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {userName}
                          </div>
                          <div className="text-xs text-muted-foreground">{tx.virtualIban.iban}</div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(tx.id)}
                            disabled={processingId === tx.id}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(tx.id)}
                            disabled={processingId === tx.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

