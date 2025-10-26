/**
 * Pay In Management Page
 * /admin/pay-in - Manage incoming fiat payments
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle, FileCheck, ArrowDownCircle, DollarSign, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface PayIn {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethodCode: string;
  status: string;
  expectedAmount: number;
  receivedAmount: number | null;
  amountMismatch: boolean;
  senderName: string | null;
  transactionId: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  paymentDate: string | null;
  createdAt: string;
  order: {
    id: string;
    paymentReference: string;
    cryptoAmount: number;
    currencyCode: string;
  };
  user: {
    id: string;
    email: string;
  };
  fiatCurrency: {
    code: string;
    name: string;
    symbol: string;
  };
  paymentMethod: {
    code: string;
    name: string;
  };
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pending', icon: Clock, color: 'bg-yellow-500' },
  RECEIVED: { label: 'Received', icon: ArrowDownCircle, color: 'bg-blue-500' },
  VERIFIED: { label: 'Verified', icon: CheckCircle, color: 'bg-green-500' },
  PARTIAL: { label: 'Partial', icon: AlertTriangle, color: 'bg-orange-500' },
  MISMATCH: { label: 'Mismatch', icon: XCircle, color: 'bg-red-500' },
  RECONCILED: { label: 'Reconciled', icon: FileCheck, color: 'bg-purple-500' },
  FAILED: { label: 'Failed', icon: XCircle, color: 'bg-red-700' },
  REFUNDED: { label: 'Refunded', icon: DollarSign, color: 'bg-gray-500' },
  EXPIRED: { label: 'Expired', icon: Clock, color: 'bg-gray-400' }
};

export default function PayInPage(): JSX.Element {
  const [payIns, setPayIns] = useState<PayIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayIn, setSelectedPayIn] = useState<PayIn | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Options for Combobox
  const [orders, setOrders] = useState<Array<{ value: string; label: string; description?: string; data?: any }>>([]);
  const [users, setUsers] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [currencies, setCurrencies] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    orderId: '',
    userId: '',
    amount: 0,
    currency: '',
    currencyType: 'FIAT' as 'FIAT' | 'CRYPTO',
    paymentMethodCode: '',
    networkCode: '',
    expectedAmount: 0
  });

  useEffect(() => {
    fetchPayIns();
  }, [filters.status]);

  useEffect(() => {
    if (createDialogOpen) {
      loadOptions();
    }
  }, [createDialogOpen]);

  const loadOptions = async (): Promise<void> => {
    try {
      setLoadingOptions(true);
      
      // Load orders without PayIn (BUY orders pay in FIAT, SELL orders pay in CRYPTO)
      const ordersRes = await fetch('/api/admin/orders?limit=100');
      const ordersData = await ordersRes.json();
      
      let availableOrders: any[] = [];
      
      if (ordersData.success || ordersData.orders) {
        const ordersList = ordersData.orders || ordersData.data || [];
        // Filter orders that don't have PayIn yet and are in appropriate status
        availableOrders = ordersList.filter((order: any) => 
          ['PENDING', 'PAYMENT_PENDING'].includes(order.status)
        );
        
        setOrders(availableOrders.map((order: any) => ({
          value: order.id,
          label: order.paymentReference,
          description: `${order.totalFiat} ${order.fiatCurrencyCode} → ${order.cryptoAmount} ${order.currencyCode}`,
          data: order // Store full order data
        })));
      }

      // Load users
      const usersRes = await fetch('/api/admin/users?limit=100');
      const usersData = await usersRes.json();
      
      if (usersData.success) {
        setUsers(usersData.data.map((user: any) => ({
          value: user.id,
          label: user.email,
          description: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'No profile'
        })));
      }

      // Load all currencies (both fiat and crypto)
      const [fiatRes, cryptoRes] = await Promise.all([
        fetch('/api/admin/resources/fiat-currencies?active=true'),
        fetch('/api/admin/resources/currencies?active=true')
      ]);

      const fiatData = await fiatRes.json();
      const cryptoData = await cryptoRes.json();

      const allCurrencies = [
        ...(fiatData.success ? fiatData.data.map((c: any) => ({
          value: c.code,
          label: `${c.code} - ${c.name}`,
          description: `${c.symbol} (FIAT)`,
          type: 'FIAT'
        })) : []),
        ...(cryptoData.success ? cryptoData.data.map((c: any) => ({
          value: c.code,
          label: `${c.code} - ${c.name}`,
          description: `${c.symbol} (CRYPTO)`,
          type: 'CRYPTO'
        })) : [])
      ];

      setCurrencies(allCurrencies);
      
      console.log('Loaded options:', {
        orders: availableOrders.length,
        users: usersData.success ? usersData.data.length : 0,
        currencies: allCurrencies.length
      });
    } catch (error) {
      console.error('Failed to load options:', error);
      toast.error('Failed to load options');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Handle order selection - auto-fill form based on order type
  const handleOrderChange = (orderId: string): void => {
    const selectedOrder = orders.find(o => o.value === orderId);
    if (!selectedOrder?.data) return;

    const order = selectedOrder.data;
    
    // For BUY orders: customer pays FIAT
    // For SELL orders: customer pays CRYPTO
    const isBuyOrder = true; // Assuming all are BUY orders for now, можно добавить order.type
    
    setCreateForm(prev => ({
      ...prev,
      orderId: orderId,
      userId: order.userId,
      // For PayIn: customer pays FIAT (BUY) or CRYPTO (SELL)
      currencyType: isBuyOrder ? 'FIAT' : 'CRYPTO',
      currency: isBuyOrder ? order.fiatCurrencyCode : order.currencyCode,
      amount: isBuyOrder ? order.totalFiat : order.cryptoAmount,
      expectedAmount: isBuyOrder ? order.totalFiat : order.cryptoAmount,
      networkCode: isBuyOrder ? '' : (order.blockchainCode || ''),
      paymentMethodCode: isBuyOrder ? 'sepa' : '' // Default payment method
    }));
  };

  const fetchPayIns = async (): Promise<void> => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/admin/pay-in?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayIns(data.data);
      } else {
        toast.error('Failed to load payments');
      }
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (payIn: PayIn): Promise<void> => {
    setSelectedPayIn(payIn);
    setDetailsOpen(true);
  };

  const updateStatus = async (id: string, newStatus: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/pay-in/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment status updated');
        await fetchPayIns();
        if (selectedPayIn?.id === id) {
          setSelectedPayIn(data.data);
        }
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const createPayIn = async (): Promise<void> => {
    try {
      // Validation
      if (!createForm.orderId || !createForm.userId || !createForm.currency || createForm.amount <= 0) {
        toast.error('Please fill all required fields');
        return;
      }

      const response = await fetch('/api/admin/pay-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('PayIn created successfully');
        setCreateDialogOpen(false);
        setCreateForm({
          orderId: '',
          userId: '',
          amount: 0,
          currency: '',
          currencyType: 'FIAT',
          paymentMethodCode: '',
          networkCode: '',
          expectedAmount: 0
        });
        await fetchPayIns();
      } else {
        toast.error(data.error || 'Failed to create PayIn');
      }
    } catch (error) {
      toast.error('Failed to create PayIn');
    }
  };

  const filteredPayIns = payIns.filter(p =>
    p.order.paymentReference.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
    (p.transactionId && p.transactionId.toLowerCase().includes(filters.search.toLowerCase()))
  );

  const stats = {
    pending: payIns.filter(p => p.status === 'PENDING').length,
    received: payIns.filter(p => p.status === 'RECEIVED').length,
    verified: payIns.filter(p => p.status === 'VERIFIED').length,
    mismatch: payIns.filter(p => p.amountMismatch).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pay In Management</h1>
          <p className="text-muted-foreground">Manage incoming fiat payments from customers</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create PayIn
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New PayIn</DialogTitle>
              <DialogDescription>
                Manually create an incoming payment record
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Order Selection - Primary */}
              <div className="space-y-2">
                <Label>Order * (determines payment type automatically)</Label>
                <Combobox
                  options={orders}
                  value={createForm.orderId}
                  onValueChange={handleOrderChange}
                  placeholder="Select order..."
                  searchPlaceholder="Search orders..."
                  emptyText="No orders found"
                  disabled={loadingOptions}
                />
                {loadingOptions && <p className="text-xs text-muted-foreground">Loading orders...</p>}
                {createForm.orderId && (
                  <p className="text-xs text-muted-foreground">
                    Payment Type: <span className="font-semibold">{createForm.currencyType}</span>
                  </p>
                )}
              </div>

              {/* User - Auto-filled but editable */}
              <div className="space-y-2">
                <Label>User *</Label>
                <Combobox
                  options={users}
                  value={createForm.userId}
                  onValueChange={(value) => setCreateForm({ ...createForm, userId: value })}
                  placeholder="Select user..."
                  searchPlaceholder="Search users..."
                  emptyText="No users found"
                  disabled={loadingOptions}
                />
                {loadingOptions && <p className="text-xs text-muted-foreground">Loading users...</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Auto-filled from order"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Combobox
                    options={currencies.filter((c: any) => c.type === createForm.currencyType)}
                    value={createForm.currency}
                    onValueChange={(value) => setCreateForm({ ...createForm, currency: value })}
                    placeholder={`Select ${createForm.currencyType} currency...`}
                    searchPlaceholder="Search currencies..."
                    emptyText="No currencies found"
                    disabled={loadingOptions || !createForm.currencyType}
                  />
                </div>
              </div>

              {createForm.currencyType === 'FIAT' ? (
                <div className="space-y-2">
                  <Label>Payment Method Code</Label>
                  <Input
                    value={createForm.paymentMethodCode}
                    onChange={(e) => setCreateForm({ ...createForm, paymentMethodCode: e.target.value })}
                    placeholder="sepa, swift, blik"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Network Code</Label>
                  <Input
                    value={createForm.networkCode}
                    onChange={(e) => setCreateForm({ ...createForm, networkCode: e.target.value.toUpperCase() })}
                    placeholder="ETHEREUM, BSC, POLYGON"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Expected Amount</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={createForm.expectedAmount}
                  onChange={(e) => setCreateForm({ ...createForm, expectedAmount: parseFloat(e.target.value) })}
                  placeholder="Same as amount if not specified"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createPayIn}>
                Create PayIn
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold">{stats.received}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mismatches</p>
                <p className="text-2xl font-bold">{stats.mismatch}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by reference, email, or transaction ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="MISMATCH">Mismatch</SelectItem>
                <SelectItem value="RECONCILED">Reconciled</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredPayIns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No payments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayIns.map((payIn) => {
            const statusInfo = statusConfig[payIn.status] || statusConfig.PENDING;
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={payIn.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetails(payIn)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {payIn.order.paymentReference}
                        </Badge>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </div>
                        {payIn.amountMismatch && (
                          <Badge variant="destructive">Amount Mismatch</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Customer</div>
                          <div className="font-medium">{payIn.user.email}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Amount</div>
                          <div className="font-medium">
                            {payIn.fiatCurrency.symbol}{payIn.amount.toFixed(2)}
                            {payIn.receivedAmount && payIn.receivedAmount !== payIn.expectedAmount && (
                              <span className="text-red-500 ml-1">
                                (Received: {payIn.fiatCurrency.symbol}{payIn.receivedAmount.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Method</div>
                          <div className="font-medium">{payIn.paymentMethod.name}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Date</div>
                          <div className="font-medium">
                            {payIn.paymentDate 
                              ? format(new Date(payIn.paymentDate), 'MMM dd, HH:mm')
                              : format(new Date(payIn.createdAt), 'MMM dd, HH:mm')
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedPayIn && (
            <>
              <SheetHeader>
                <SheetTitle>Payment Details</SheetTitle>
                <SheetDescription>
                  {selectedPayIn.order.paymentReference}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const statusInfo = statusConfig[selectedPayIn.status];
                        const StatusIcon = statusInfo.icon;
                        return (
                          <Badge className={`${statusInfo.color} text-white`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        );
                      })()}
                    </div>

                    {selectedPayIn.status === 'RECEIVED' && (
                      <div className="flex gap-2">
                        <Button onClick={() => updateStatus(selectedPayIn.id, 'VERIFIED')} className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Payment
                        </Button>
                        <Button onClick={() => updateStatus(selectedPayIn.id, 'FAILED')} variant="destructive" className="flex-1">
                          <XCircle className="h-4 w-4 mr-2" />
                          Mark Failed
                        </Button>
                      </div>
                    )}

                    {selectedPayIn.status === 'VERIFIED' && (
                      <Button onClick={() => updateStatus(selectedPayIn.id, 'RECONCILED')} className="w-full">
                        <FileCheck className="h-4 w-4 mr-2" />
                        Mark as Reconciled
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Amount:</span>
                      <span className="font-medium">
                        {selectedPayIn.fiatCurrency.symbol}{selectedPayIn.expectedAmount.toFixed(2)}
                      </span>
                    </div>
                    {selectedPayIn.receivedAmount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Received Amount:</span>
                        <span className={`font-medium ${selectedPayIn.amountMismatch ? 'text-red-500' : ''}`}>
                          {selectedPayIn.fiatCurrency.symbol}{selectedPayIn.receivedAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <span className="font-medium">{selectedPayIn.paymentMethod.name}</span>
                    </div>
                    {selectedPayIn.senderName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sender Name:</span>
                        <span className="font-medium">{selectedPayIn.senderName}</span>
                      </div>
                    )}
                    {selectedPayIn.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transaction ID:</span>
                        <span className="font-mono text-xs">{selectedPayIn.transactionId}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Related Order</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Reference:</span>
                      <span className="font-mono">{selectedPayIn.order.paymentReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crypto Amount:</span>
                      <span className="font-medium">
                        {selectedPayIn.order.cryptoAmount} {selectedPayIn.order.currencyCode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span>{selectedPayIn.user.email}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

