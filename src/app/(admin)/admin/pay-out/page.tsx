/**
 * Pay Out Management Page
 * /admin/pay-out - Manage outgoing crypto payments
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { Search, CheckCircle, XCircle, Clock, Send, Loader2, ExternalLink, ArrowUpCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface PayOut {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  networkCode: string;
  destinationAddress: string;
  transactionHash: string | null;
  status: string;
  confirmations: number;
  networkFee: number;
  processedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  order: any;
  user: any;
  cryptocurrency: any;
  network: any;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pending', icon: Clock, color: 'bg-yellow-500' },
  QUEUED: { label: 'Queued', icon: Loader2, color: 'bg-blue-500' },
  PROCESSING: { label: 'Processing', icon: Loader2, color: 'bg-blue-600' },
  SENT: { label: 'Sent', icon: Send, color: 'bg-indigo-500' },
  CONFIRMING: { label: 'Confirming', icon: Loader2, color: 'bg-purple-500' },
  CONFIRMED: { label: 'Confirmed', icon: CheckCircle, color: 'bg-green-500' },
  FAILED: { label: 'Failed', icon: XCircle, color: 'bg-red-500' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'bg-gray-500' }
};

export default function PayOutPage(): JSX.Element {
  const [payOuts, setPayOuts] = useState<PayOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayOut, setSelectedPayOut] = useState<PayOut | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processingDialogOpen, setProcessingDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Options for Combobox
  const [orders, setOrders] = useState<Array<{ value: string; label: string; description?: string; data?: any }>>([]);
  const [users, setUsers] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<any[]>([]);
  const [cryptocurrencies, setCryptocurrencies] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  const [processForm, setProcessForm] = useState({
    transactionHash: '',
    networkFee: 0,
    processingNotes: ''
  });

  const [createForm, setCreateForm] = useState({
    orderId: '',
    userId: '',
    amount: 0,
    currency: '',
    currencyType: 'CRYPTO' as 'FIAT' | 'CRYPTO',
    networkCode: '',
    destinationAddress: '',
    paymentMethodCode: '',
    paymentAccountId: '', // NEW: connected account
    recipientAccount: '',
    recipientName: ''
  });

  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchPayOuts();
  }, [filters.status]);

  useEffect(() => {
    if (createDialogOpen) {
      loadOptions();
    }
  }, [createDialogOpen]);

  const loadOptions = async (): Promise<void> => {
    try {
      setLoadingOptions(true);
      
      // Load orders with verified PayIn (ready for PayOut)
      const ordersRes = await fetch('/api/admin/orders?limit=100');
      const ordersData = await ordersRes.json();
      
      let availableOrders: any[] = [];
      
      if (ordersData.success || ordersData.orders) {
        const ordersList = ordersData.orders || ordersData.data || [];
        // Filter orders that are ready for PayOut (PROCESSING status typically)
        availableOrders = ordersList.filter((order: any) => 
          ['PROCESSING', 'PAYMENT_PENDING'].includes(order.status)
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

      if (fiatData.success) {
        setFiatCurrencies(fiatData.data || []);
      }
      if (cryptoData.success) {
        setCryptocurrencies(cryptoData.data || []);
      }

      // Load blockchain networks
      const networksRes = await fetch('/api/admin/blockchains');
      const networksData = await networksRes.json();
      
      if (networksData.success) {
        setNetworks(networksData.networks || []);
      }
      
      // Load payment methods (OUT or BOTH direction)
      const methodsRes = await fetch('/api/admin/payment-methods');
      const methodsData = await methodsRes.json();
      
      if (methodsData.success) {
        const outMethods = methodsData.methods.filter((m: any) => 
          m.direction === 'OUT' || m.direction === 'BOTH'
        );
        setPaymentMethods(outMethods);
      }
      
      // Load payment accounts
      const accountsRes = await fetch('/api/admin/payment-accounts');
      const accountsData = await accountsRes.json();
      
      if (accountsData.success) {
        setPaymentAccounts(accountsData.accounts || []);
      }
      
      console.log('Loaded PayOut options:', {
        orders: availableOrders.length,
        users: usersData.success ? usersData.data.length : 0,
        fiatCurrencies: fiatData.success ? fiatData.data.length : 0,
        cryptocurrencies: cryptoData.success ? cryptoData.data.length : 0,
        networks: networksData.success ? networksData.networks.length : 0,
        paymentMethods: methodsData.success ? methodsData.methods.length : 0,
        paymentAccounts: accountsData.success ? accountsData.accounts.length : 0
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
    
    // For BUY orders: customer receives CRYPTO
    // For SELL orders: customer receives FIAT
    const isBuyOrder = true; // Assuming BUY orders, можно добавить order.type
    
    setCreateForm(prev => ({
      ...prev,
      orderId: orderId,
      userId: order.userId,
      // For PayOut: customer receives CRYPTO (BUY) or FIAT (SELL)
      currencyType: isBuyOrder ? 'CRYPTO' : 'FIAT',
      currency: isBuyOrder ? order.currencyCode : order.fiatCurrencyCode,
      amount: isBuyOrder ? order.cryptoAmount : order.totalFiat,
      networkCode: isBuyOrder ? (order.blockchainCode || 'ETHEREUM') : '',
      destinationAddress: isBuyOrder ? order.walletAddress : '',
      paymentMethodCode: '', // Reset to let user select
      paymentAccountId: '', // Reset
      recipientAccount: '',
      recipientName: ''
    }));
  };
  
  // NEW: Handle payment method selection
  const handlePaymentMethodChange = (methodCode: string): void => {
    const selectedMethod = paymentMethods.find(m => m.code === methodCode);
    if (!selectedMethod) return;
    
    console.log('📝 Selected Payment Method (PayOut):', selectedMethod);
    
    // Auto-fill from payment method
    setCreateForm(prev => ({
      ...prev,
      paymentMethodCode: methodCode,
      currency: selectedMethod.currency, // Set default, user can change
      paymentAccountId: selectedMethod.paymentAccountId || '',
      networkCode: selectedMethod.supportedNetworks?.[0] || prev.networkCode
    }));
  };
  
  // Get available currencies based on payment method type
  const getAvailableCurrencies = () => {
    if (!createForm.paymentMethodCode) return [];
    
    const selectedMethod = paymentMethods.find(m => m.code === createForm.paymentMethodCode);
    if (!selectedMethod) return [];
    
    // CRYPTO_WALLET -> cryptocurrencies
    if (selectedMethod.providerType === 'CRYPTO_WALLET') {
      return cryptocurrencies.map(c => ({
        value: c.code,
        label: `${c.code} - ${c.name}`,
        description: c.symbol
      }));
    }
    
    // BANK_ACCOUNT, PSP, MANUAL -> fiat currencies
    return fiatCurrencies.map(c => ({
      value: c.code,
      label: `${c.code} - ${c.name}`,
      description: c.symbol
    }));
  };
  
  // Filter payment methods by currency type
  const filteredPaymentMethods = paymentMethods.filter(method => {
    if (createForm.currencyType === 'FIAT') {
      return method.providerType !== 'CRYPTO_WALLET';
    } else {
      return method.providerType === 'CRYPTO_WALLET' || method.providerType === 'MANUAL';
    }
  });
  
  // Get selected payment method details
  const selectedPaymentMethod = createForm.paymentMethodCode 
    ? paymentMethods.find(m => m.code === createForm.paymentMethodCode)
    : null;
    
  // Get connected payment account if exists
  const connectedAccount = selectedPaymentMethod?.paymentAccountId
    ? paymentAccounts.find(a => a.id === selectedPaymentMethod.paymentAccountId)
    : null;

  const fetchPayOuts = async (): Promise<void> => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/admin/pay-out?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayOuts(data.data);
      }
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (payOut: PayOut): void => {
    setSelectedPayOut(payOut);
    setDetailsOpen(true);
  };

  const updateStatus = async (id: string, newStatus: string, additionalData?: any): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/pay-out/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...additionalData })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment status updated');
        await fetchPayOuts();
        if (selectedPayOut?.id === id) {
          setSelectedPayOut(data.data);
        }
        setProcessingDialogOpen(false);
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleProcess = async (): Promise<void> => {
    if (!selectedPayOut) return;
    
    await updateStatus(selectedPayOut.id, 'SENT', {
      transactionHash: processForm.transactionHash,
      networkFee: processForm.networkFee,
      processingNotes: processForm.processingNotes,
      sentAt: new Date().toISOString()
    });
  };

  const createPayOut = async (): Promise<void> => {
    try {
      // Validation
      if (!createForm.orderId || !createForm.userId || !createForm.currency || createForm.amount <= 0) {
        toast.error('Please fill all required fields');
        return;
      }

      const response = await fetch('/api/admin/pay-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('PayOut created successfully');
        setCreateDialogOpen(false);
        setCreateForm({
          orderId: '',
          userId: '',
          amount: 0,
          currency: '',
          currencyType: 'CRYPTO',
          networkCode: '',
          destinationAddress: '',
          paymentMethodCode: '',
          paymentAccountId: '',
          recipientAccount: '',
          recipientName: ''
        });
        await fetchPayOuts();
      } else {
        toast.error(data.error || 'Failed to create PayOut');
      }
    } catch (error) {
      toast.error('Failed to create PayOut');
    }
  };

  const filteredPayOuts = payOuts.filter(p =>
    p.order.paymentReference.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
    (p.transactionHash && p.transactionHash.toLowerCase().includes(filters.search.toLowerCase()))
  );

  const stats = {
    pending: payOuts.filter(p => p.status === 'PENDING').length,
    sent: payOuts.filter(p => p.status === 'SENT' || p.status === 'CONFIRMING').length,
    confirmed: payOuts.filter(p => p.status === 'CONFIRMED').length,
    failed: payOuts.filter(p => p.status === 'FAILED').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pay Out Management</h1>
          <p className="text-muted-foreground">Manage outgoing crypto payments to customers</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create PayOut
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New PayOut</DialogTitle>
              <DialogDescription>
                Manually create an outgoing payment record
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
                  <Label>Currency Type *</Label>
                  <Input
                    value={createForm.currencyType}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Determined by order type
                  </p>
                </div>
              </div>

              {/* Payment Method Selection - NEW */}
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Combobox
                  options={filteredPaymentMethods.map(pm => ({
                    value: pm.code,
                    label: pm.name,
                    description: `${pm.currency} - ${pm.providerType}${pm.isActive ? '' : ' (Inactive)'}`
                  }))}
                  value={createForm.paymentMethodCode}
                  onValueChange={handlePaymentMethodChange}
                  placeholder="Select payment method..."
                  searchPlaceholder="Search methods..."
                  emptyText={filteredPaymentMethods.length === 0 ? 
                    `No ${createForm.currencyType} payment methods available` : 
                    'No methods found'
                  }
                  disabled={loadingOptions || !createForm.orderId}
                />
                {!createForm.orderId && (
                  <p className="text-xs text-yellow-600">
                    Please select an order first
                  </p>
                )}
                
                {/* Show payment method details */}
                {selectedPaymentMethod && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Provider:</span>
                      <Badge variant="outline">{selectedPaymentMethod.providerType}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Automation:</span>
                      <Badge variant="outline">{selectedPaymentMethod.automationLevel}</Badge>
                    </div>
                    {connectedAccount && (
                      <>
                        <div className="h-px bg-blue-200 dark:bg-blue-800" />
                        <div className="text-xs">
                          <p className="font-semibold text-blue-900 dark:text-blue-100">
                            Connected Account:
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            {connectedAccount.name}
                          </p>
                          <p className="text-blue-600 dark:text-blue-400">
                            {connectedAccount.type === 'BANK_ACCOUNT' 
                              ? `${connectedAccount.bankName} - ${connectedAccount.iban || 'N/A'}`
                              : `${connectedAccount.address || 'N/A'}`
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Currency - editable based on payment method type */}
              <div className="space-y-2">
                <Label>Currency *</Label>
                <Combobox
                  options={getAvailableCurrencies()}
                  value={createForm.currency}
                  onValueChange={(value) => setCreateForm({ ...createForm, currency: value })}
                  placeholder="Select currency..."
                  searchPlaceholder="Search currencies..."
                  emptyText={!createForm.paymentMethodCode ? 
                    'Please select a payment method first' : 
                    'No currencies available'
                  }
                  disabled={loadingOptions || !createForm.paymentMethodCode}
                />
              </div>

              {createForm.currencyType === 'CRYPTO' ? (
                <>
                  {/* Additional fields based on currency type */}
                  {createForm.networkCode && (
                    <div className="space-y-2">
                      <Label>Network</Label>
                      <Input
                        value={createForm.networkCode}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        From payment method
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Destination Address *</Label>
                    <Input
                      value={createForm.destinationAddress}
                      onChange={(e) => setCreateForm({ ...createForm, destinationAddress: e.target.value })}
                      placeholder="0x... or bc1q..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Recipient Name</Label>
                      <Input
                        value={createForm.recipientName}
                        onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Recipient Account</Label>
                      <Input
                        value={createForm.recipientAccount}
                        onChange={(e) => setCreateForm({ ...createForm, recipientAccount: e.target.value })}
                        placeholder="IBAN or Account"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createPayOut}>
                Create PayOut
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
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
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
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
                  placeholder="Search by reference, email, or TX hash..."
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
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="CONFIRMING">Confirming</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
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
      ) : filteredPayOuts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No payments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayOuts.map((payOut) => {
            const statusInfo = statusConfig[payOut.status];
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={payOut.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetails(payOut)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {payOut.order.paymentReference}
                        </Badge>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Customer</div>
                          <div className="font-medium">{payOut.user.email}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Amount</div>
                          <div className="font-medium">
                            {payOut.amount} {payOut.cryptocurrency.code}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Network</div>
                          <div className="font-medium">{payOut.network.name}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Date</div>
                          <div className="font-medium">
                            {payOut.sentAt 
                              ? format(new Date(payOut.sentAt), 'MMM dd, HH:mm')
                              : format(new Date(payOut.createdAt), 'MMM dd, HH:mm')
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
          {selectedPayOut && (
            <>
              <SheetHeader>
                <SheetTitle>Payment Details</SheetTitle>
                <SheetDescription>
                  {selectedPayOut.order.paymentReference}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Actions */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const statusInfo = statusConfig[selectedPayOut.status];
                        const StatusIcon = statusInfo.icon;
                        return (
                          <Badge className={`${statusInfo.color} text-white`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        );
                      })()}
                    </div>

                    {selectedPayOut.status === 'PENDING' && (
                      <Button onClick={() => setProcessingDialogOpen(true)} className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Process Payment
                      </Button>
                    )}

                    {selectedPayOut.transactionHash && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(`${selectedPayOut.network.explorerUrl}/tx/${selectedPayOut.transactionHash}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Explorer
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Info */}
                <Card>
                  <CardContent className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">{selectedPayOut.amount} {selectedPayOut.cryptocurrency.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network:</span>
                      <span className="font-medium">{selectedPayOut.network.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="font-mono text-xs">{selectedPayOut.destinationAddress.slice(0, 20)}...</span>
                    </div>
                    {selectedPayOut.transactionHash && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TX Hash:</span>
                          <span className="font-mono text-xs">{selectedPayOut.transactionHash.slice(0, 20)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confirmations:</span>
                          <span className="font-medium">{selectedPayOut.confirmations}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Processing Dialog */}
      {processingDialogOpen && selectedPayOut && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold">Process Payment</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Transaction Hash *</label>
                  <Input
                    value={processForm.transactionHash}
                    onChange={(e) => setProcessForm({ ...processForm, transactionHash: e.target.value })}
                    placeholder="0x..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Network Fee</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={processForm.networkFee}
                    onChange={(e) => setProcessForm({ ...processForm, networkFee: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={processForm.processingNotes}
                    onChange={(e) => setProcessForm({ ...processForm, processingNotes: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleProcess} className="flex-1" disabled={!processForm.transactionHash}>
                    Confirm & Mark as Sent
                  </Button>
                  <Button onClick={() => setProcessingDialogOpen(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

