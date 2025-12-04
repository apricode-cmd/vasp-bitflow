/**
 * Manual Reconcile Dialog
 * 
 * Модальное окно для ручной сверки транзакции с заказом
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Link2, ExternalLink, Search, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  senderName: string | null;
  senderIban: string | null;
  reference: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

interface Order {
  id: string;
  orderNumber: string;
  totalFiat: number;
  currency: string;
  status: string;
  paymentReference: string | null;
  createdAt: string;
  cryptoCurrency: string;
  cryptoAmount: number;
}

interface ManualReconcileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  userId: string;
  onReconciled: () => void;
}

export function ManualReconcileDialog({
  isOpen,
  onClose,
  transaction,
  userId,
  onReconciled,
}: ManualReconcileDialogProps): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUserOrders();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    // Filter orders by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredOrders(
        orders.filter(
          (order) =>
            order.orderNumber.toLowerCase().includes(query) ||
            order.paymentReference?.toLowerCase().includes(query) ||
            order.cryptoCurrency.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredOrders(orders);
    }
  }, [searchQuery, orders]);

  const fetchUserOrders = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/orders?status=PENDING`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
        setFilteredOrders(data.data);
      } else {
        toast.error('Failed to fetch user orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to fetch user orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (): Promise<void> => {
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    setReconciling(true);
    const toastId = toast.loading('Reconciling transaction...');

    try {
      const response = await fetch('/api/admin/virtual-iban/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          orderId: selectedOrderId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Transaction reconciled successfully!', { id: toastId });
        onReconciled();
        onClose();
      } else {
        toast.error(data.error || 'Reconciliation failed', { id: toastId });
      }
    } catch (error) {
      console.error('Reconcile error:', error);
      toast.error('Failed to reconcile transaction', { id: toastId });
    } finally {
      setReconciling(false);
    }
  };

  const getAmountMatch = (order: Order): 'exact' | 'close' | 'mismatch' => {
    const diff = Math.abs(order.totalFiat - transaction.amount);
    if (diff === 0) return 'exact';
    if (diff < 1) return 'close'; // Within 1 EUR
    return 'mismatch';
  };

  const getReferenceMatch = (order: Order): boolean => {
    if (!transaction.reference || !order.paymentReference) return false;
    return (
      transaction.reference.toLowerCase().includes(order.paymentReference.toLowerCase()) ||
      order.paymentReference.toLowerCase().includes(transaction.reference.toLowerCase())
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Reconciliation</DialogTitle>
          <DialogDescription>
            Select an order to link with this transaction
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Info */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Transaction Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Amount:</span>{' '}
              <span className="font-semibold text-green-600">
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sender:</span>{' '}
              <span className="font-medium">{transaction.senderName || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Reference:</span>{' '}
              {transaction.reference ? (
                <code className="bg-background px-2 py-0.5 rounded text-xs">
                  {transaction.reference}
                </code>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>{' '}
              <span>{formatDateTime(transaction.processedAt || transaction.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, reference, or currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No orders found matching your search' : 'No pending orders found for this user'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const amountMatch = getAmountMatch(order);
                  const referenceMatch = getReferenceMatch(order);
                  const isSelected = selectedOrderId === order.id;

                  return (
                    <TableRow
                      key={order.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedOrderId(order.id)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/orders/${order.id}`} target="_blank">
                          <div className="hover:underline">
                            <p className="font-medium">#{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            amountMatch === 'exact'
                              ? 'text-green-600 font-semibold'
                              : amountMatch === 'close'
                              ? 'text-yellow-600 font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {formatCurrency(order.totalFiat, order.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.cryptoCurrency}</p>
                          <p className="text-xs text-muted-foreground">{order.cryptoAmount}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.paymentReference ? (
                          <code
                            className={`text-xs px-2 py-0.5 rounded ${
                              referenceMatch ? 'bg-green-100 text-green-800' : 'bg-muted'
                            }`}
                          >
                            {order.paymentReference}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(new Date(order.createdAt))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {amountMatch === 'exact' && (
                            <Badge variant="success" className="text-xs">
                              Amount ✓
                            </Badge>
                          )}
                          {amountMatch === 'close' && (
                            <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">
                              Amount ~
                            </Badge>
                          )}
                          {referenceMatch && (
                            <Badge variant="success" className="text-xs">
                              Ref ✓
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isSelected ? 'default' : 'ghost'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reconciling}>
            Cancel
          </Button>
          <Button onClick={handleReconcile} disabled={!selectedOrderId || reconciling}>
            <Link2 className="h-4 w-4 mr-2" />
            {reconciling ? 'Reconciling...' : 'Reconcile Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

