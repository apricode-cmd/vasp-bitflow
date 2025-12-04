/**
 * TransactionsTab Component
 * 
 * Список транзакций для Virtual IBAN счёта
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { ArrowDownToLine, ArrowUpFromLine, Link2, ExternalLink, Wallet } from 'lucide-react';
import Link from 'next/link';
import { ManualReconcileDialog } from './ManualReconcileDialog';

interface Transaction {
  id: string;
  providerTransactionId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  senderName: string | null;
  senderIban: string | null;
  reference: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  processedAt: Date | null;
  createdAt: Date;
  orderId: string | null;
  payInId: string | null;
  reconciliationMethod: string | null;
  reconciledAt: Date | null;
  // TopUp request link
  topUpRequest?: {
    id: string;
    reference: string;
    amount: number;
    status: string;
    completedAt: Date | null;
  } | null;
}

interface TransactionsTabProps {
  transactions: Transaction[];
  accountCurrency: string;
  userId: string; // User ID for manual reconciliation
  onRefresh: () => void; // Callback to refresh data after reconciliation
}

export function TransactionsTab({ 
  transactions, 
  accountCurrency,
  userId,
  onRefresh,
}: TransactionsTabProps): JSX.Element {
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleOpenReconcileDialog = (tx: Transaction): void => {
    setSelectedTransaction(tx);
    setReconcileDialogOpen(true);
  };

  const handleReconciled = (): void => {
    setReconcileDialogOpen(false);
    setSelectedTransaction(null);
    onRefresh(); // Refresh transactions list
  };
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No transactions yet</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    PENDING: { variant: 'secondary' as const, label: 'Pending' },
    COMPLETED: { variant: 'success' as const, label: 'Completed' },
    FAILED: { variant: 'destructive' as const, label: 'Failed' },
    REVERSED: { variant: 'warning' as const, label: 'Reversed' },
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reconciliation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const config = statusConfig[tx.status] || { variant: 'default' as const, label: tx.status };
              const isReconciled = !!tx.orderId && !!tx.payInId;
              const isTopUp = !!tx.topUpRequest;
              
              return (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tx.type === 'CREDIT' ? (
                        <ArrowDownToLine className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{tx.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className={tx.type === 'CREDIT' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
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
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {isTopUp ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                          <Wallet className="h-3 w-3 mr-1" />
                          TopUp
                        </Badge>
                        <code className="text-xs text-muted-foreground">
                          {tx.topUpRequest?.reference}
                        </code>
                      </div>
                    ) : isReconciled ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="success" className="text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          Reconciled
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {tx.reconciliationMethod}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="warning" className="text-xs">Unreconciled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(tx.processedAt || tx.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isReconciled ? (
                      tx.orderId && (
                        <Link href={`/admin/orders/${tx.orderId}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )
                    ) : tx.type === 'CREDIT' && tx.status === 'COMPLETED' && !isTopUp ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenReconcileDialog(tx)}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Reconcile
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Manual Reconcile Dialog */}
    {selectedTransaction && (
      <ManualReconcileDialog
        isOpen={reconcileDialogOpen}
        onClose={() => {
          setReconcileDialogOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        userId={userId}
        onReconciled={handleReconciled}
      />
    )}
  </>
  );
}





