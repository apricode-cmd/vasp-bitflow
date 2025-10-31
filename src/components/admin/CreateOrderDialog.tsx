/**
 * Create Order Dialog for Admin
 * 
 * Features:
 * - Real-time rate fetching from CoinGecko
 * - User search by email
 * - Automatic calculations
 * - Custom rate override
 * - Wallet address validation
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { 
  Plus, Loader2, TrendingUp, DollarSign, 
  Wallet as WalletIcon, User, Info, RefreshCw,
  AlertCircle, CheckCircle2, CreditCard, ArrowDownCircle,
  ArrowUpCircle, ArrowLeftRight, Network
} from 'lucide-react';
import { createAdminOrderSchema, type CreateAdminOrderInput } from '@/lib/validations/admin-order';
import { formatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { calculateOrderTotal } from '@/lib/utils/order-calculations';

interface ExchangeRates {
  [key: string]: { [key: string]: number };
  updatedAt: string;
  feePercentage: number;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  chain?: string;
}

interface FiatCurrency {
  code: string;
  name: string;
  symbol: string;
}

interface BlockchainNetwork {
  code: string;
  name: string;
  symbol?: string; // Make optional since it might be undefined
  isActive: boolean;
}

interface CreateOrderDialogProps {
  onSuccess?: () => void;
}

type OrderType = 'BUY' | 'SELL';

export function CreateOrderDialog({ onSuccess }: CreateOrderDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('BUY');
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [tradingPairFee, setTradingPairFee] = useState<number>(0.015); // Default 1.5%
  
  // Data from API
  const [users, setUsers] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [cryptocurrencies, setCryptocurrencies] = useState<Currency[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<FiatCurrency[]>([]);
  const [blockchainNetworks, setBlockchainNetworks] = useState<BlockchainNetwork[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ 
    code: string; 
    name: string; 
    currency: string; 
    direction: string;
    isActive: boolean;
  }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CreateAdminOrderInput & { blockchainCode?: string }>({
    resolver: zodResolver(createAdminOrderSchema),
    defaultValues: {
      currencyCode: 'BTC',
      fiatCurrencyCode: 'EUR',
      cryptoAmount: 0,
      walletAddress: '',
      userEmail: '',
      customRate: undefined,
      adminNotes: '',
      blockchainCode: ''
    }
  });

  const watchedFields = watch();
  const currentRate = rates && watchedFields.currencyCode && watchedFields.fiatCurrencyCode
    ? rates[watchedFields.currencyCode as keyof typeof rates]?.[watchedFields.fiatCurrencyCode as 'EUR' | 'PLN']
    : null;

  // Calculate order total
  const calculation = rates && watchedFields.cryptoAmount > 0 && currentRate
    ? calculateOrderTotal(
        watchedFields.cryptoAmount,
        useCustomRate && watchedFields.customRate ? watchedFields.customRate : currentRate,
        tradingPairFee // Use trading pair specific fee
      )
    : null;

  // Fetch trading pair fee when currency pair changes
  useEffect(() => {
    const fetchTradingPairFee = async () => {
      if (!watchedFields.currencyCode || !watchedFields.fiatCurrencyCode) return;

      try {
        const response = await fetch(
          `/api/admin/trading-pairs?cryptoCode=${watchedFields.currencyCode}&fiatCode=${watchedFields.fiatCurrencyCode}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            // feePercent is stored as percentage (e.g. 1.5), convert to decimal
            setTradingPairFee(data.pairs[0].feePercent / 100);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trading pair fee:', error);
        // Keep default fee if fetch fails
      }
    };

    fetchTradingPairFee();
  }, [watchedFields.currencyCode, watchedFields.fiatCurrencyCode]);

  // Fetch exchange rates
  const fetchRates = async (forceRefresh = false): Promise<void> => {
    setRatesLoading(true);
    try {
      const url = forceRefresh ? '/api/rates?force=true' : '/api/rates';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRates(data);
        if (forceRefresh) {
          toast.success('Exchange rates updated', {
            description: `Updated at ${new Date(data.updatedAt).toLocaleTimeString()}`
          });
        }
      } else {
        toast.error('Failed to load exchange rates');
      }
    } catch (error) {
      console.error('Failed to fetch rates:', error);
      toast.error('Failed to load exchange rates');
    } finally {
      setRatesLoading(false);
    }
  };

  // Fetch users for combobox
  const fetchUsers = async (): Promise<void> => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users?limit=100');
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.map((user: any) => ({
          value: user.email,
          label: user.email,
          description: user.profile 
            ? `${user.profile.firstName} ${user.profile.lastName}` 
            : 'No profile'
        })));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch currencies, fiat currencies, and blockchain networks
  const fetchCurrenciesAndNetworks = async (): Promise<void> => {
    setLoadingData(true);
    try {
      const [cryptoRes, fiatRes, blockchainRes, methodsRes] = await Promise.all([
        fetch('/api/admin/resources/currencies?active=true'),
        fetch('/api/admin/resources/fiat-currencies?active=true'),
        fetch('/api/admin/blockchains?active=true'),
        fetch('/api/admin/payment-methods')
      ]);

      const [cryptoData, fiatData, blockchainData, methodsData] = await Promise.all([
        cryptoRes.json(),
        fiatRes.json(),
        blockchainRes.json(),
        methodsRes.json()
      ]);

      if (cryptoData.success && Array.isArray(cryptoData.data)) {
        setCryptocurrencies(cryptoData.data);
      }

      if (fiatData.success && Array.isArray(fiatData.data)) {
        setFiatCurrencies(fiatData.data);
      }

      if (blockchainData.success && Array.isArray(blockchainData.data)) {
        const activeNetworks = blockchainData.data.filter((n: any) => n.isActive);
        setBlockchainNetworks(activeNetworks);
      }

      if (Array.isArray(methodsData.methods)) {
        setPaymentMethods(methodsData.methods);
      }
    } catch (error) {
      console.error('Failed to fetch currencies/networks:', error);
      toast.error('Failed to load currencies and networks');
    } finally {
      setLoadingData(false);
    }
  };

  // Load rates and users when dialog opens
  useEffect(() => {
    if (open) {
      fetchRates();
      fetchUsers();
      fetchCurrenciesAndNetworks();
      const interval = setInterval(fetchRates, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [open]);

  const onSubmit = async (data: CreateAdminOrderInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      // Always send the rate that was shown in UI to ensure consistency
      // Either custom rate or the current market rate
      const effectiveRate = useCustomRate && data.customRate 
        ? data.customRate 
        : currentRate;

      if (!effectiveRate) {
        toast.error('Exchange rate not available. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...data,
        customRate: effectiveRate // Send the rate user saw in preview
      };

      const response = await fetch('/api/admin/orders/create-for-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          // Zod validation errors
          result.details.forEach((err: any) => {
            toast.error(`${err.path.join('.')}: ${err.message}`);
          });
        } else {
          toast.error(result.error || 'Failed to create order');
        }
        setIsSubmitting(false);
        return;
      }

      toast.success('Order created successfully!', {
        description: `Reference: ${result.data.paymentReference}`
      });

      setOpen(false);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Create order error:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="default" className="font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Create Order for Client
          </DialogTitle>
          <DialogDescription>
            Create a new cryptocurrency purchase order on behalf of a client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Type Toggle - BUY/SELL */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">Order Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {orderType === 'BUY' 
                      ? 'Customer pays fiat, receives cryptocurrency' 
                      : 'Customer pays cryptocurrency, receives fiat'}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={orderType === 'BUY' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setOrderType('BUY')}
                    className={`gap-2 ${orderType === 'BUY' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    BUY Crypto
                  </Button>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    variant={orderType === 'SELL' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setOrderType('SELL')}
                    className={`gap-2 ${orderType === 'SELL' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    SELL Crypto
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="userEmail">
              Customer Email *
            </Label>
            <Combobox
              options={users}
              value={watchedFields.userEmail}
              onValueChange={(value) => setValue('userEmail', value)}
              placeholder="Select customer..."
              searchPlaceholder="Search by email..."
              emptyText="No users found"
              disabled={loadingUsers}
            />
            {loadingUsers && <p className="text-xs text-muted-foreground">Loading users...</p>}
            {errors.userEmail && (
              <p className="text-sm text-destructive">{errors.userEmail.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              Customer must have approved KYC
            </p>
          </div>

          {/* Payment Method Selection - Required field after Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method *
            </Label>
            {loadingData ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={paymentMethods
                  .filter(method => {
                    // Filter by active status and direction
                    const direction = orderType === 'BUY' ? ['IN', 'BOTH'] : ['OUT', 'BOTH'];
                    return method.isActive && direction.includes(method.direction);
                  })
                  .map(method => ({
                    value: method.code,
                    label: method.name,
                    description: `${method.currency} - ${method.direction}${!method.isActive ? ' (Inactive)' : ''}`
                  }))}
                value={watchedFields.paymentMethodCode || ''}
                onValueChange={(value) => {
                  setValue('paymentMethodCode', value);
                  // Auto-fill fiat currency from payment method
                  const selectedMethod = paymentMethods.find(m => m.code === value);
                  if (selectedMethod) {
                    setValue('fiatCurrencyCode', selectedMethod.currency as 'EUR' | 'PLN');
                  }
                }}
                placeholder="Select payment method..."
                searchPlaceholder="Search methods..."
                emptyText="No active payment methods available"
              />
            )}
            {errors.paymentMethodCode && (
              <p className="text-sm text-destructive">{errors.paymentMethodCode.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              Customer will use this method to pay
            </p>
          </div>

          <Separator />

          {/* Currency Pair */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Cryptocurrency *</Label>
              {loadingData ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Combobox
                  options={cryptocurrencies.map(crypto => ({
                    value: crypto.code,
                    label: `${crypto.name} (${crypto.code})`,
                    description: `${crypto.symbol} - ${crypto.chain || 'Multiple chains'}`
                  }))}
                  value={watchedFields.currencyCode}
                  onValueChange={(value) => setValue('currencyCode', value as any)}
                  placeholder="Select cryptocurrency..."
                  searchPlaceholder="Search crypto..."
                  emptyText="No active cryptocurrencies"
                />
              )}
              {errors.currencyCode && (
                <p className="text-sm text-destructive">{errors.currencyCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiatCurrencyCode">Fiat Currency *</Label>
              {loadingData ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <Combobox
                    options={fiatCurrencies.map(fiat => ({
                      value: fiat.code,
                      label: `${fiat.name} (${fiat.code})`,
                      description: `${fiat.symbol}`
                    }))}
                    value={watchedFields.fiatCurrencyCode}
                    onValueChange={(value) => setValue('fiatCurrencyCode', value as any)}
                    placeholder="Select fiat currency..."
                    searchPlaceholder="Search currency..."
                    emptyText="No active fiat currencies"
                    disabled={!!watchedFields.paymentMethodCode}
                  />
                  {watchedFields.paymentMethodCode && (
                    <p className="text-xs text-muted-foreground">
                      <Info className="inline h-3 w-3 mr-1" />
                      Auto-filled from Payment Method
                    </p>
                  )}
                </>
              )}
              {errors.fiatCurrencyCode && (
                <p className="text-sm text-destructive">{errors.fiatCurrencyCode.message}</p>
              )}
            </div>
          </div>

          {/* Blockchain Network Selection - Only for BUY orders */}
          {orderType === 'BUY' && watchedFields.currencyCode && (
            <div className="space-y-2">
              <Label htmlFor="blockchainNetwork" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Blockchain Network *
              </Label>
              {loadingData ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Combobox
                  options={blockchainNetworks
                    .filter(network => {
                      // Filter networks by selected cryptocurrency
                      const selectedCrypto = cryptocurrencies.find(c => c.code === watchedFields.currencyCode);
                      if (!selectedCrypto?.chain) return true; // Show all if no chain specified
                      return network.code === selectedCrypto.chain || 
                             selectedCrypto.chain.includes(network.code);
                    })
                    .map(network => ({
                      value: network.code,
                      label: `${network.name} (${network.code})`,
                      description: network.symbol ? `${network.symbol}` : network.code
                    }))}
                  value={watchedFields.blockchainCode || ''}
                  onValueChange={(value) => setValue('blockchainCode', value)}
                  placeholder="Select blockchain network..."
                  searchPlaceholder="Search network..."
                  emptyText="No active blockchain networks"
                />
              )}
              <p className="text-xs text-muted-foreground">
                <Info className="inline h-3 w-3 mr-1" />
                Select the blockchain network for cryptocurrency transfer
              </p>
            </div>
          )}

          {/* Exchange Rate */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Current Exchange Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  {ratesLoading ? (
                    <Skeleton className="h-6 w-32" />
                  ) : currentRate ? (
                    <>
                      <Badge variant="secondary" className="font-mono">
                        1 {watchedFields.currencyCode} = {formatCurrency(currentRate, watchedFields.fiatCurrencyCode)}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => fetchRates(true)}
                        disabled={ratesLoading}
                        title="Force refresh rates from CoinGecko"
                      >
                        <RefreshCw className={`h-3 w-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="destructive">Rate not available</Badge>
                  )}
                </div>
              </div>

              {rates && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date(rates.updatedAt).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Custom Rate Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="useCustomRate" className="text-base">
                Use Custom Rate
              </Label>
              <p className="text-sm text-muted-foreground">
                Override the current market rate
              </p>
            </div>
            <Switch
              id="useCustomRate"
              checked={useCustomRate}
              onCheckedChange={setUseCustomRate}
            />
          </div>

          {useCustomRate && (
            <div className="space-y-2">
              <Label htmlFor="customRate">Custom Rate *</Label>
              <Input
                id="customRate"
                type="number"
                step="0.01"
                placeholder="Enter custom rate"
                {...register('customRate', { valueAsNumber: true })}
              />
              {errors.customRate && (
                <p className="text-sm text-destructive">{errors.customRate.message}</p>
              )}
            </div>
          )}

          <Separator />

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="cryptoAmount">
              Cryptocurrency Amount *
            </Label>
            <Input
              id="cryptoAmount"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              {...register('cryptoAmount', { valueAsNumber: true })}
            />
            {errors.cryptoAmount && (
              <p className="text-sm text-destructive">{errors.cryptoAmount.message}</p>
            )}
          </div>

          {/* Calculation Preview */}
          {calculation && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Order Summary</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.fiatAmount, watchedFields.fiatCurrencyCode)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Platform Fee ({(tradingPairFee * 100).toFixed(1)}%):
                    </span>
                    <span className="font-medium">
                      {formatCurrency(calculation.fee, watchedFields.fiatCurrencyCode)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total to Pay:</span>
                    <span className="text-primary">
                      {formatCurrency(calculation.totalFiat, watchedFields.fiatCurrencyCode)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress">
              Customer Wallet Address *
            </Label>
            <Input
              id="walletAddress"
              placeholder="Enter customer's cryptocurrency wallet address"
              {...register('walletAddress')}
            />
            {errors.walletAddress && (
              <p className="text-sm text-destructive">{errors.walletAddress.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Cryptocurrency will be sent to this address after payment confirmation
            </p>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">
              Admin Notes (Optional)
            </Label>
            <Textarea
              id="adminNotes"
              placeholder="Add any internal notes about this order..."
              rows={3}
              {...register('adminNotes')}
            />
            {errors.adminNotes && (
              <p className="text-sm text-destructive">{errors.adminNotes.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !rates || !calculation}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

