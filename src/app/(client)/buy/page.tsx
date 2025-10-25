/**
 * Buy Cryptocurrency Page
 * 
 * Enhanced form for creating cryptocurrency purchase orders with modern UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, type CreateOrderInput } from '@/lib/validations/order';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Combobox, type ComboboxOption } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { 
  Loader2, Info, TrendingUp, Wallet, AlertCircle, 
  CheckCircle2, ArrowRight, Sparkles, DollarSign, HelpCircle
} from 'lucide-react';
import { CurrencyIcon } from '@/components/features/CurrencyIcon';
import { calculateOrderTotal } from '@/lib/utils/order-calculations';
import { formatFiatCurrency, formatCryptoAmount } from '@/lib/formatters';

interface ExchangeRates {
  BTC: { EUR: number; PLN: number };
  ETH: { EUR: number; PLN: number };
  USDT: { EUR: number; PLN: number };
  SOL: { EUR: number; PLN: number };
  updatedAt: string;
  feePercentage: number;
}

// Helper to create icon element
const getCryptoIcon = (currency: string) => {
  return <CurrencyIcon currency={currency as any} className="h-4 w-4" />;
};

const getFiatIcon = (currency: string) => {
  if (currency === 'EUR') {
    return <span className="font-semibold text-blue-600">€</span>;
  }
  return <span className="font-semibold text-red-600">zł</span>;
};

export default function BuyPage(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [calculation, setCalculation] = useState<{
    fiatAmount: number;
    fee: number;
    totalFiat: number;
  } | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      currencyCode: 'BTC',
      fiatCurrencyCode: 'EUR',
      amount: undefined,
      walletAddress: ''
    }
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors }
  } = form;

  const watchedFields = watch();

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const response = await fetch('/api/rates');
        if (response.ok) {
          const data = await response.json();
          setRates(data);
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

    fetchRates();
    const interval = setInterval(fetchRates, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate order total when inputs change
  useEffect(() => {
    if (rates && watchedFields.amount && watchedFields.currencyCode && watchedFields.fiatCurrencyCode) {
      const rate = rates[watchedFields.currencyCode][watchedFields.fiatCurrencyCode];
      const calc = calculateOrderTotal(watchedFields.amount, rate, rates.feePercentage);
      setCalculation(calc);
    } else {
      setCalculation(null);
    }
  }, [rates, watchedFields.amount, watchedFields.currencyCode, watchedFields.fiatCurrencyCode]);

  const onSubmit = async (data: CreateOrderInput) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to create order');
        setIsLoading(false);
        return;
      }

      toast.success('Order created successfully!');
      router.push(`/orders/${result.id}`);
    } catch (error) {
      console.error('Create order error:', error);
      toast.error('An error occurred');
      setIsLoading(false);
    }
  };

  const currentRate = rates && watchedFields.currencyCode && watchedFields.fiatCurrencyCode
    ? rates[watchedFields.currencyCode][watchedFields.fiatCurrencyCode]
    : null;

  // Cryptocurrency options for Combobox
  const cryptoOptions: ComboboxOption[] = [
    {
      value: 'BTC',
      label: 'Bitcoin (BTC)',
      icon: getCryptoIcon('BTC'),
      description: 'The original cryptocurrency'
    },
    {
      value: 'ETH',
      label: 'Ethereum (ETH)',
      icon: getCryptoIcon('ETH'),
      description: 'Smart contract platform'
    },
    {
      value: 'USDT',
      label: 'Tether (USDT)',
      icon: getCryptoIcon('USDT'),
      description: 'Stablecoin pegged to USD'
    },
    {
      value: 'SOL',
      label: 'Solana (SOL)',
      icon: getCryptoIcon('SOL'),
      description: 'High-performance blockchain'
    },
  ];

  // Fiat currency options
  const fiatOptions: ComboboxOption[] = [
    {
      value: 'EUR',
      label: 'Euro (EUR)',
      icon: getFiatIcon('EUR'),
      description: 'European currency'
    },
    {
      value: 'PLN',
      label: 'Polish Zloty (PLN)',
      icon: getFiatIcon('PLN'),
      description: 'Polish currency'
    },
  ];

  const selectedCrypto = cryptoOptions.find(opt => opt.value === watchedFields.currencyCode);
  const selectedFiat = fiatOptions.find(opt => opt.value === watchedFields.fiatCurrencyCode);

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto space-y-6 animate-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Secure Cryptocurrency Purchase</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Buy Cryptocurrency</h1>
          <p className="text-muted-foreground text-lg">
            Purchase crypto with bank transfer. Payment details will be provided after order creation.
          </p>
        </div>

        {/* Rate Update Indicator */}
        {rates && !ratesLoading && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              Rates updated {new Date(rates.updatedAt).toLocaleTimeString()} • Auto-refresh every 30s
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Create Order
              </CardTitle>
              <CardDescription>Select cryptocurrency and enter purchase details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Cryptocurrency Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="crypto">Cryptocurrency</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose which cryptocurrency you want to buy</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Controller
                    name="currencyCode"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={cryptoOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select cryptocurrency..."
                        searchPlaceholder="Search crypto..."
                        disabled={isLoading}
                      />
                    )}
                  />
                  {errors.currencyCode && (
                    <p className="text-sm text-destructive">{errors.currencyCode.message}</p>
                  )}
                </div>

                <Separator />

                {/* Fiat Currency Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="fiat">Pay With</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose your payment currency</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Controller
                    name="fiatCurrencyCode"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={fiatOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select currency..."
                        searchPlaceholder="Search currency..."
                        disabled={isLoading}
                      />
                    )}
                  />
                  {errors.fiatCurrencyCode && (
                    <p className="text-sm text-destructive">{errors.fiatCurrencyCode.message}</p>
                  )}
                </div>

                <Separator />

                {/* Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="amount">
                        Amount ({watchedFields.currencyCode || 'BTC'})
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enter the amount of cryptocurrency you want to buy</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {currentRate && !ratesLoading && (
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        1 {watchedFields.currencyCode} = {formatFiatCurrency(currentRate, watchedFields.fiatCurrencyCode || 'EUR')}
                      </Badge>
                    )}
                  </div>
                  <Input
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    step="any"
                    placeholder="0.001"
                    disabled={isLoading || ratesLoading}
                    className="text-lg font-mono"
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <Separator />

                {/* Wallet Address */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="wallet">
                      <Wallet className="h-4 w-4 inline mr-1" />
                      Your Wallet Address
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Enter the {watchedFields.currencyCode} wallet address where you want to receive your cryptocurrency</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    {...register('walletAddress')}
                    type="text"
                    placeholder={`Enter your ${watchedFields.currencyCode || 'crypto'} wallet address`}
                    disabled={isLoading}
                    className="font-mono text-sm"
                  />
                  {errors.walletAddress && (
                    <p className="text-sm text-destructive">{errors.walletAddress.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Cryptocurrency will be sent to this address after payment confirmation
                  </p>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={isLoading || ratesLoading || !rates} 
                  className="w-full gradient-primary" 
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      Create Order
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Order Summary & Info */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : calculation ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You Buy:</span>
                      <span className="font-semibold flex items-center gap-2">
                        {selectedCrypto?.icon}
                        {formatCryptoAmount(watchedFields.amount || 0, watchedFields.currencyCode || 'BTC')} {watchedFields.currencyCode}
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        {formatFiatCurrency(calculation.fiatAmount, watchedFields.fiatCurrencyCode || 'EUR')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Platform Fee:</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs cursor-help">1.5%</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Our transparent service fee</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-medium">
                        {formatFiatCurrency(calculation.fee, watchedFields.fiatCurrencyCode || 'EUR')}
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">Total to Pay:</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary flex items-center gap-2">
                          {selectedFiat?.icon}
                          {formatFiatCurrency(calculation.totalFiat, watchedFields.fiatCurrencyCode || 'EUR')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Including all fees
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Enter amount to see calculation
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How it Works */}
            <Card className="border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-3">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      How it works:
                    </p>
                    <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Create your order with desired amount</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Transfer funds to provided bank account</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Upload payment proof for verification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Receive crypto in your wallet within 24h</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
