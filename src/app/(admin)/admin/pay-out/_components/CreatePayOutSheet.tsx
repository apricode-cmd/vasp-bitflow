/**
 * Create PayOut Sheet Component
 * Sheet (drawer) for manually creating PayOut transactions
 * PayOut must be linked to an existing Order
 * 
 * 🔄 IMPORTANT: PayOut Direction Logic
 * 
 * BUY Order (покупка криптовалюты):
 * - Customer PAYS: Fiat (EUR/PLN) → Platform (This is PayIn)
 * - Customer RECEIVES: Crypto (BTC/USDC) → ✅ THIS IS PAYOUT
 * 
 * SELL Order (продажа криптовалюты - будущая фаза):
 * - Customer SENDS: Crypto → Platform (This is PayIn)
 * - Customer RECEIVES: Fiat → ✅ THIS IS PAYOUT
 * 
 * Currently only BUY orders are supported in this component.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ArrowUpCircle, 
  Check, 
  ChevronsUpDown, 
  User,
  CreditCard,
  Wallet,
  Send,
  AlertCircle,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  paymentReference: string;
  type: 'BUY' | 'SELL';
  cryptoAmount: number;
  currencyCode: string;
  walletAddress: string | null;
  totalFiat: number;
  status: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  fiatCurrency: {
    code: string;
    symbol: string;
  };
  blockchain: {
    code: string;
    name: string;
  } | null;
  paymentMethod: {
    name: string;
  } | null;
}

interface CreatePayOutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePayOutSheet({
  open,
  onOpenChange,
  onSuccess,
}: CreatePayOutSheetProps): JSX.Element {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  // Form fields
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [networkFee, setNetworkFee] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [status, setStatus] = useState<string>('PENDING');
  const [destinationTag, setDestinationTag] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Available payment methods
  const [paymentMethods, setPaymentMethods] = useState<Array<{ code: string; name: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableOrders();
      fetchPaymentMethods();
    } else {
      // Reset form when closed
      resetForm();
    }
  }, [open]);

  const resetForm = (): void => {
    setSelectedOrderId('');
    setOrderData(null);
    setDestinationAddress('');
    setAmount('');
    setNetworkFee('');
    setProcessingNotes('');
    setStatus('PENDING');
    setDestinationTag('');
    setExplorerUrl('');
    setTransactionHash('');
    setPaymentMethodCode('');
  };

  const handleOpenChange = (newOpen: boolean): void => {
    if (!submitting) {
      onOpenChange(newOpen);
    }
  };

  const fetchAvailableOrders = async (): Promise<void> => {
    setOrdersLoading(true);
    try {
      const response = await fetch('/api/admin/orders?withoutPayOut=true&limit=100');
      const data = await response.json();
      
      if (data.orders && Array.isArray(data.orders)) {
        setAvailableOrders(data.orders);
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

  const fetchPaymentMethods = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/payment-methods');
      const data = await response.json();
      
      if (data.methods && Array.isArray(data.methods)) {
        setPaymentMethods(data.methods.map((m: any) => ({ code: m.code, name: m.name })));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleOrderSelect = (orderId: string): void => {
    setSelectedOrderId(orderId);
    setComboboxOpen(false);
    
    if (orderId) {
      loadOrderDetails(orderId);
    } else {
      setOrderData(null);
      setDestinationAddress('');
      setAmount('');
    }
  };

  const loadOrderDetails = async (orderId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setOrderData(data.data);
        
        // Auto-fill destination address from order
        if (data.data.walletAddress) {
          setDestinationAddress(data.data.walletAddress);
        }
        
        // Auto-fill amount from order crypto amount
        if (data.data.cryptoAmount) {
          setAmount(data.data.cryptoAmount.toString());
        }

        // Auto-fill explorer URL if blockchain is available
        if (data.data.blockchain) {
          setExplorerUrl(data.data.blockchain.explorerUrl || '');
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!selectedOrderId || !orderData) {
      toast.error('Please select an order');
      return;
    }

    if (!destinationAddress) {
      toast.error('Destination address is required');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Valid amount is required');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/pay-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderId,
          amount: parseFloat(amount),
          destinationAddress,
          networkFee: networkFee ? parseFloat(networkFee) : undefined,
          notes: processingNotes,
          status,
          destinationTag: destinationTag || undefined,
          explorerUrl: explorerUrl || undefined,
          transactionHash: transactionHash || undefined,
          paymentMethodCode: paymentMethodCode || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('PayOut created successfully');
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(data.error || 'Failed to create PayOut');
      }
    } catch (error) {
      console.error('Error creating PayOut:', error);
      toast.error('Failed to create PayOut');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[600px] w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-orange-500" />
            Create PayOut Transaction
          </SheetTitle>
          <SheetDescription>
            Manually create a crypto payout for an existing order
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4 -mr-4">
          <form onSubmit={handleSubmit} className="space-y-6 py-6">
            {/* Step 1: Select Order */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  1
                </div>
                <h3 className="font-semibold">Select Order</h3>
              </div>
              
              <div>
                <Label>Order *</Label>
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
                      <CommandList>
                        <CommandEmpty>
                          {ordersLoading ? 'Loading...' : 'No available orders found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableOrders.map((order) => (
                            <CommandItem
                              key={order.id}
                              value={`${order.paymentReference} ${order.user.email} ${order.id}`}
                              onSelect={() => {
                                handleOrderSelect(order.id);
                              }}
                              style={{ pointerEvents: 'auto' }}
                              className="cursor-pointer [&>*]:pointer-events-none"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4 shrink-0',
                                  selectedOrderId === order.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm font-semibold">
                                    {order.paymentReference}
                                  </span>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                  <span className="truncate">{order.user.email}</span>
                                  <span className="font-semibold shrink-0 whitespace-nowrap">
                                    {order.cryptoAmount} {order.currency.code}
                                  </span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
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
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <CheckCircle2 className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <div className="space-y-2">
                      <div className="font-semibold">Order Found</div>
                      
                      {/* Customer Info */}
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 mt-0.5 text-orange-600" />
                        <div>
                          <div className="font-medium">
                            {orderData.user.profile?.firstName} {orderData.user.profile?.lastName}
                          </div>
                          <div className="text-muted-foreground">{orderData.user.email}</div>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="flex items-start gap-2 text-sm">
                        <CreditCard className="h-4 w-4 mt-0.5 text-orange-600" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-orange-600">
                              SEND Crypto
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              (Platform sends crypto to customer)
                            </span>
                          </div>
                          <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            📤 PayOut: {orderData.cryptoAmount} {orderData.currency.code} → Customer
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline">{orderData.status}</Badge>
                            {orderData.blockchain && (
                              <Badge variant="secondary">{orderData.blockchain.name}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Step 2: Payment Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  2
                </div>
                <h3 className="font-semibold">Payment Details</h3>
              </div>

              {/* Destination Address */}
              <div className="space-y-2">
                <Label htmlFor="destinationAddress" className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  Destination Address *
                </Label>
                <Input
                  id="destinationAddress"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="0x... or bc1..."
                  required
                  disabled={!orderData}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Customer's wallet address where crypto will be sent
                </p>
              </div>

              {/* Destination Tag (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="destinationTag">
                  Destination Tag / Memo (Optional)
                </Label>
                <Input
                  id="destinationTag"
                  value={destinationTag}
                  onChange={(e) => setDestinationTag(e.target.value)}
                  placeholder="For XRP, XLM, etc."
                  disabled={!orderData}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Required for some cryptocurrencies like XRP, XLM
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-1">
                  <Send className="h-3.5 w-3.5" />
                  Amount ({orderData?.currency.code || 'Crypto'}) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                  required
                  disabled={!orderData}
                />
                <p className="text-xs text-muted-foreground">
                  Crypto amount to send to customer
                </p>
              </div>

              {/* Network Fee */}
              <div className="space-y-2">
                <Label htmlFor="networkFee">
                  Network Fee ({orderData?.currency.code || 'Crypto'})
                </Label>
                <Input
                  id="networkFee"
                  type="number"
                  step="any"
                  value={networkFee}
                  onChange={(e) => setNetworkFee(e.target.value)}
                  placeholder="0.00000000"
                  disabled={!orderData}
                />
                <p className="text-xs text-muted-foreground">
                  Blockchain transaction fee (optional, for tracking)
                </p>
              </div>

              {/* Transaction Hash */}
              <div className="space-y-2">
                <Label htmlFor="transactionHash">
                  Transaction Hash (Optional)
                </Label>
                <Input
                  id="transactionHash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="0x... or txid..."
                  disabled={!orderData}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Blockchain transaction hash if already sent
                </p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">
                  Payment Method (Optional)
                </Label>
                <Select value={paymentMethodCode || undefined} onValueChange={(value) => setPaymentMethodCode(value || '')} disabled={!orderData}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Select payment method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.code} value={method.code}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Crypto wallet or payment provider used for this payout
                </p>
              </div>
            </div>

            {/* Step 3: Additional Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  3
                </div>
                <h3 className="font-semibold">Additional Information</h3>
              </div>

              {/* Initial Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={!orderData}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="QUEUED">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        Queued
                      </div>
                    </SelectItem>
                    <SelectItem value="PROCESSING">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Processing
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Status will automatically update when transaction is sent
                </p>
              </div>

              {/* Processing Notes */}
              <div className="space-y-2">
                <Label htmlFor="processingNotes">Admin Notes</Label>
                <Textarea
                  id="processingNotes"
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  placeholder="Internal notes about this payout..."
                  rows={3}
                  disabled={!orderData}
                />
                <p className="text-xs text-muted-foreground">
                  Optional notes visible only to admins
                </p>
              </div>
            </div>

            {/* Warning */}
            {orderData && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Double-check the destination address before creating this PayOut. 
                  Cryptocurrency transactions are irreversible.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!selectedOrderId || submitting}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Create PayOut
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
