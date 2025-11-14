/**
 * Create PayIn Sheet Component
 * Sheet (drawer) for manually creating PayIn transactions
 * PayIn must be linked to an existing Order
 */

'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, Loader2, AlertCircle, CheckCircle2, User, CreditCard, Banknote, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderOption {
  id: string;
  paymentReference: string;
  userId: string;
  currencyCode: string;
  fiatCurrencyCode: string;
  cryptoAmount: number;
  totalFiat: number;
  status: string;
  createdAt: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  fiatCurrency: {
    code: string;
    symbol: string;
  };
  currency: {
    code: string;
  };
}

interface OrderData extends OrderOption {
  paymentMethodCode: string | null;
  blockchainCode: string | null;
  blockchain?: {
    name: string;
    code: string;
  } | null;
  paymentMethod?: {
    name: string;
    code: string;
  } | null;
}

interface CreatePayInSheetProps {
  onSuccess?: () => void;
}

export function CreatePayInSheet({ onSuccess }: CreatePayInSheetProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<OrderOption[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  // Form fields
  const [receivedAmount, setReceivedAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [reference, setReference] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  // Fetch orders without PayIn
  const fetchAvailableOrders = async (): Promise<void> => {
    setOrdersLoading(true);
    try {
      const response = await fetch('/api/admin/orders?withoutPayIn=true&limit=100');
      const data = await response.json();
      
      if (data.success && data.data) {
        setAvailableOrders(data.data);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load order details when selected
  const loadOrderDetails = async (orderId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setOrderData(data.data);
        
        // Auto-fill reference if available
        if (data.data.paymentReference) {
          setReference(data.data.paymentReference);
        }
      } else {
        toast.error('Order not found');
        setOrderData(null);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      setOrderData(null);
    }
  };

  // Load orders when sheet opens
  useEffect(() => {
    if (open && availableOrders.length === 0) {
      fetchAvailableOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async (): Promise<void> => {
    if (!orderData) {
      toast.error('Please select an order first');
      return;
    }

    if (!receivedAmount || parseFloat(receivedAmount) <= 0) {
      toast.error('Please enter a valid received amount');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch('/api/admin/pay-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          currencyType: 'FIAT', // Based on order's fiat currency
          fiatCurrencyCode: orderData.fiatCurrencyCode,
          cryptocurrencyCode: orderData.currencyCode,
          expectedAmount: orderData.totalFiat,
          receivedAmount: parseFloat(receivedAmount),
          paymentMethodCode: orderData.paymentMethodCode,
          networkCode: orderData.blockchainCode,
          senderName: senderName || undefined,
          senderAccount: senderAccount || undefined,
          senderBank: senderBank || undefined,
          reference: reference || undefined,
          transactionId: transactionId || undefined,
          verificationNotes: verificationNotes || undefined,
          status: 'RECEIVED', // Set as RECEIVED by default for manual creation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create PayIn');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('PayIn created successfully');
        resetForm();
        setOpen(false);
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Failed to create PayIn');
      }
    } catch (error) {
      console.error('Error creating PayIn:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create PayIn');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetForm = (): void => {
    setSelectedOrderId('');
    setOrderData(null);
    setReceivedAmount('');
    setSenderName('');
    setSenderAccount('');
    setSenderBank('');
    setReference('');
    setTransactionId('');
    setVerificationNotes('');
  };

  // Handle order selection
  const handleOrderSelect = (orderId: string): void => {
    setSelectedOrderId(orderId);
    setComboboxOpen(false);
    loadOrderDetails(orderId);
  };

  const handleOpenChange = (newOpen: boolean): void => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create PayIn
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[600px] w-full">
        <SheetHeader>
          <SheetTitle>Create PayIn Transaction</SheetTitle>
          <SheetDescription>
            Manually record an incoming payment for an existing order
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4 -mr-4">
          <div className="space-y-6 py-6">
            {/* Step 1: Select Order */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  1
                </div>
                <h3 className="font-semibold">Select Order</h3>
              </div>
              
              <div>
                <Label>Order</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                      disabled={ordersLoading}
                    >
                      {selectedOrderId
                        ? availableOrders.find((order) => order.id === selectedOrderId)?.paymentReference || 'Select order...'
                        : ordersLoading
                        ? 'Loading orders...'
                        : 'Select order...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0">
                    <Command>
                      <CommandInput placeholder="Search by reference, email, or amount..." />
                      <CommandEmpty>
                        {ordersLoading ? 'Loading...' : 'No available orders found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[300px]">
                          {availableOrders.map((order) => (
                            <CommandItem
                              key={order.id}
                              value={`${order.paymentReference}-${order.user.email}-${order.id}`}
                              onSelect={() => {
                                handleOrderSelect(order.id);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedOrderId === order.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-sm font-semibold">
                                    {order.paymentReference}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{order.user.email}</span>
                                  <span className="font-semibold">
                                    {order.cryptoAmount} {order.currency.code} → {order.fiatCurrency.symbol}
                                    {order.totalFiat.toFixed(2)} {order.fiatCurrency.code}
                                  </span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {availableOrders.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {availableOrders.length} order(s) available
                  </p>
                )}
              </div>

              {orderData && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="space-y-2">
                      <div className="font-semibold">Order Found</div>
                      
                      {/* Customer Info */}
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 mt-0.5 text-green-600" />
                        <div>
                          <div className="font-medium">
                            {orderData.user.profile?.firstName} {orderData.user.profile?.lastName}
                          </div>
                          <div className="text-muted-foreground">{orderData.user.email}</div>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="flex items-start gap-2 text-sm">
                        <CreditCard className="h-4 w-4 mt-0.5 text-green-600" />
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">{orderData.cryptoAmount} {orderData.currency.code}</span>
                            {' → '}
                            <span className="font-medium">
                              {orderData.fiatCurrency.symbol}{orderData.totalFiat.toFixed(2)} {orderData.fiatCurrency.code}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{orderData.status}</Badge>
                            {orderData.blockchain && (
                              <Badge variant="secondary">{orderData.blockchain.name}</Badge>
                            )}
                            {orderData.paymentMethod && (
                              <Badge variant="secondary">{orderData.paymentMethod.name}</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment Reference */}
                      {orderData.paymentReference && (
                        <div className="flex items-start gap-2 text-sm">
                          <Banknote className="h-4 w-4 mt-0.5 text-green-600" />
                          <div>
                            <div className="text-muted-foreground">Payment Reference:</div>
                            <div className="font-mono text-xs">{orderData.paymentReference}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {orderData && (
              <>
                <Separator />

                {/* Step 2: Payment Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      2
                    </div>
                    <h3 className="font-semibold">Payment Details</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Expected vs Received Amount */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Expected Amount</Label>
                        <Input
                          value={`${orderData.fiatCurrency.symbol}${orderData.totalFiat.toFixed(2)}`}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label>Received Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Amount Mismatch Warning */}
                    {receivedAmount && parseFloat(receivedAmount) !== orderData.totalFiat && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Amount mismatch detected! Expected: {orderData.fiatCurrency.symbol}
                          {orderData.totalFiat.toFixed(2)}, Received: {orderData.fiatCurrency.symbol}
                          {parseFloat(receivedAmount).toFixed(2)}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Sender Information */}
                    <div>
                      <Label>Sender Name</Label>
                      <Input
                        placeholder="Name of the sender"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Sender Account</Label>
                      <Input
                        placeholder="IBAN, account number, or crypto address"
                        value={senderAccount}
                        onChange={(e) => setSenderAccount(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Sender Bank</Label>
                      <Input
                        placeholder="Bank name or payment provider"
                        value={senderBank}
                        onChange={(e) => setSenderBank(e.target.value)}
                      />
                    </div>

                    {/* Transaction Details */}
                    <div>
                      <Label>Payment Reference</Label>
                      <Input
                        placeholder="Reference number"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Transaction ID</Label>
                      <Input
                        placeholder="Bank transaction ID or hash"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <Label>Verification Notes</Label>
                      <Textarea
                        placeholder="Add any notes about this payment..."
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleCreate}
                    disabled={createLoading || !receivedAmount || parseFloat(receivedAmount) <= 0}
                    className="flex-1"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Create PayIn
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

