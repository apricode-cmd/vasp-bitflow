/**
 * Enhanced Order Details Sheet
 * 
 * Features:
 * - Full order information
 * - PayIn/PayOut tracking
 * - Order status history (timeline)
 * - Customer info
 * - Quick actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatDateTime, formatCryptoAmount } from '@/lib/formatters';
import { OrderStatusBadge } from '@/components/features/OrderStatusBadge';
import { QuickNav } from '@/components/crm/QuickNav';
import { toast } from 'sonner';
import { 
  Users, Coins, Ban, CheckCircle, Clock, 
  ArrowDownCircle, ArrowUpCircle, History, 
  ExternalLink, Copy, Check, AlertCircle,
  FileText, CreditCard, Wallet as WalletIcon,
  TrendingUp, DollarSign, XCircle
} from 'lucide-react';
import Link from 'next/link';
import type { OrderStatus } from '@prisma/client';

interface Order {
  id: string;
  cryptoAmount: number;
  currencyCode: string;
  fiatCurrencyCode: string;
  totalFiat: number;
  status: OrderStatus;
  paymentReference: string;
  createdAt: Date;
  walletAddress: string;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string; } | null;
  };
}

interface PayIn {
  id: string;
  amount: number;
  currency: string;
  currencyType: 'FIAT' | 'CRYPTO';
  status: string;
  createdAt: string;
  receivedDate?: string | null;
  verifiedAt?: string | null;
  senderName?: string | null;
  transactionHash?: string | null;
  transactionId?: string | null;
}

interface PayOut {
  id: string;
  amount: number;
  currency: string;
  currencyType: 'FIAT' | 'CRYPTO';
  status: string;
  createdAt: string;
  sentAt?: string | null;
  confirmedAt?: string | null;
  transactionHash?: string | null;
  destinationAddress?: string | null;
}

interface OrderHistory {
  id: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  note?: string;
  createdAt: string;
  changedBy: string;
}

interface OrderDetailsSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onCancel: (orderId: string) => void;
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
  onStatusUpdate,
  onCancel
}: OrderDetailsSheetProps): JSX.Element {
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [payIn, setPayIn] = useState<PayIn | null>(null);
  const [payOut, setPayOut] = useState<PayOut | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open && order) {
      fetchPayments();
      fetchHistory();
    }
  }, [open, order]);

  const fetchPayments = async (): Promise<void> => {
    if (!order) return;
    
    setLoadingPayments(true);
    try {
      const [payInRes, payOutRes] = await Promise.all([
        fetch(`/api/admin/pay-in?orderId=${order.id}`),
        fetch(`/api/admin/pay-out?orderId=${order.id}`)
      ]);

      const payInData = await payInRes.json();
      const payOutData = await payOutRes.json();

      if (payInData.success && payInData.data.length > 0) {
        setPayIn(payInData.data[0]);
      }

      if (payOutData.success && payOutData.data.length > 0) {
        setPayOut(payOutData.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payment information');
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchHistory = async (): Promise<void> => {
    if (!order) return;

    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/history`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to load order history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const copyToClipboard = async (text: string, field: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      PENDING: 'text-amber-600',
      RECEIVED: 'text-orange-600',
      VERIFIED: 'text-blue-600',
      QUEUED: 'text-blue-600',
      SENT: 'text-green-600',
      CONFIRMED: 'text-green-600',
      COMPLETED: 'text-green-600',
      FAILED: 'text-red-600',
      CANCELLED: 'text-red-600'
    };
    return statusColors[status] || 'text-muted-foreground';
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons: Record<OrderStatus, React.ComponentType<any>> = {
      PENDING: Clock,
      PAYMENT_PENDING: DollarSign,
      PROCESSING: TrendingUp,
      COMPLETED: CheckCircle,
      CANCELLED: XCircle,
      EXPIRED: AlertCircle,
      REFUNDED: ArrowDownCircle
    };
    return icons[status] || Clock;
  };

  if (!order) return <></>;

  const StatusIcon = getStatusIcon(order.status);
  const userInitials = `${order.user.profile?.firstName?.charAt(0) || ''}${order.user.profile?.lastName?.charAt(0) || 'U'}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Order Details
          </SheetTitle>
          <SheetDescription>
            Reference: <span className="font-mono font-semibold">{order.paymentReference}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6 pr-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="h-4 w-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {order.user.profile?.firstName} {order.user.profile?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.user.email}</p>
                    </div>
                    <Link href={`/admin/users/${order.user.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Reference</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {order.paymentReference}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(order.paymentReference, 'reference')}
                      >
                        {copiedField === 'reference' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Cryptocurrency</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {order.currencyCode}
                      </Badge>
                      <span className="font-semibold">
                        {formatCryptoAmount(order.cryptoAmount, order.currencyCode)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">{formatDateTime(order.createdAt)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Wallet Address</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(order.walletAddress, 'wallet')}
                      >
                        {copiedField === 'wallet' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-md border">
                      <p className="text-xs font-mono break-all">{order.walletAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.status === 'PENDING' && (
                    <Button 
                      className="w-full" 
                      onClick={() => onStatusUpdate(order.id, 'PROCESSING')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Mark as Processing
                    </Button>
                  )}
                  {order.status === 'PAYMENT_PENDING' && (
                    <Button 
                      className="w-full" 
                      onClick={() => onStatusUpdate(order.id, 'PROCESSING')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Verify & Process
                    </Button>
                  )}
                  {order.status === 'PROCESSING' && (
                    <Button 
                      className="w-full" 
                      onClick={() => onStatusUpdate(order.id, 'COMPLETED')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  )}
                  {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                    <>
                      <Separator />
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => onCancel(order.id)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Cancel Order
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6 mt-6">
              {loadingPayments ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  {/* Pay In */}
                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-orange-600" />
                        Pay In (Customer Payment)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payIn ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={getStatusColor(payIn.status)}>
                              {payIn.status}
                            </Badge>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="font-semibold">
                              {payIn.amount} {payIn.currency}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <Badge variant="secondary">{payIn.currencyType}</Badge>
                          </div>
                          {payIn.senderName && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Sender</span>
                              <span className="text-sm">{payIn.senderName}</span>
                            </div>
                          )}
                          {payIn.transactionHash && (
                            <div className="space-y-1">
                              <span className="text-sm text-muted-foreground">TX Hash</span>
                              <div className="p-2 bg-muted/50 rounded-md border font-mono text-xs break-all">
                                {payIn.transactionHash}
                              </div>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Created</span>
                            <span>{formatDateTime(new Date(payIn.createdAt))}</span>
                          </div>
                          {payIn.verifiedAt && (
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Verified</span>
                              <span>{formatDateTime(new Date(payIn.verifiedAt))}</span>
                            </div>
                          )}
                          <Link href={`/admin/pay-in`}>
                            <Button variant="outline" size="sm" className="w-full mt-2">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No payment received yet
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pay Out */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                        Pay Out (Crypto Transfer)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payOut ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={getStatusColor(payOut.status)}>
                              {payOut.status}
                            </Badge>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="font-semibold">
                              {payOut.amount} {payOut.currency}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <Badge variant="secondary">{payOut.currencyType}</Badge>
                          </div>
                          {payOut.destinationAddress && (
                            <div className="space-y-1">
                              <span className="text-sm text-muted-foreground">Destination</span>
                              <div className="p-2 bg-muted/50 rounded-md border font-mono text-xs break-all">
                                {payOut.destinationAddress}
                              </div>
                            </div>
                          )}
                          {payOut.transactionHash && (
                            <div className="space-y-1">
                              <span className="text-sm text-muted-foreground">TX Hash</span>
                              <div className="p-2 bg-muted/50 rounded-md border font-mono text-xs break-all">
                                {payOut.transactionHash}
                              </div>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Created</span>
                            <span>{formatDateTime(new Date(payOut.createdAt))}</span>
                          </div>
                          {payOut.sentAt && (
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Sent</span>
                              <span>{formatDateTime(new Date(payOut.sentAt))}</span>
                            </div>
                          )}
                          {payOut.confirmedAt && (
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Confirmed</span>
                              <span>{formatDateTime(new Date(payOut.confirmedAt))}</span>
                            </div>
                          )}
                          <Link href={`/admin/pay-out`}>
                            <Button variant="outline" size="sm" className="w-full mt-2">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No payout created yet
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : history.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-border" />
                  
                  <div className="space-y-6">
                    {history.map((entry, index) => {
                      const StatusIconEntry = getStatusIcon(entry.newStatus);
                      return (
                        <div key={entry.id} className="relative pl-12">
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1 h-10 w-10 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                            <StatusIconEntry className="h-4 w-4 text-primary" />
                          </div>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-sm">
                                    {entry.oldStatus} → {entry.newStatus}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDateTime(new Date(entry.createdAt))}
                                  </p>
                                </div>
                                <OrderStatusBadge status={entry.newStatus} />
                              </div>
                              {entry.note && (
                                <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                  {entry.note}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No history available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

