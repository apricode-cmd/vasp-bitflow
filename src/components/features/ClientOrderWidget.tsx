/**
 * Client Order Widget
 * 
 * Buy cryptocurrency widget for clients - similar to admin CreateOrderDialog
 * but with simplified UI for end-users
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/shared/Combobox';
import { CurrencyIcon } from '@/components/features/CurrencyIcon';
import { toast } from 'sonner';
import { 
  ArrowDownUp, TrendingUp, Info, Loader2, ChevronRight,
  RefreshCw, Wallet, AlertCircle, Network, ShoppingCart
} from 'lucide-react';
import { formatFiatCurrency, formatCryptoAmount } from '@/lib/formatters';
import { calculateOrderTotal } from '@/lib/utils/order-calculations';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  coingeckoId: string | null;
  iconUrl: string | null;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  decimals: number;
  blockchainNetworks?: Array<{
    blockchain: {
      code: string;
      name: string;
      isActive: boolean;
    };
  }>;
}

interface FiatCurrency {
  code: string;
  name: string;
  symbol: string;
}

interface PaymentMethod {
  code: string;
  name: string;
  type: string;
  fee: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  description: string | null;
  currency: string;
  direction: string; // IN, OUT, or BOTH
}

interface BlockchainNetwork {
  code: string;
  name: string;
  symbol?: string;
  isActive: boolean;
}

interface ExchangeRates {
  [key: string]: { [key: string]: number };
  updatedAt: string;
}

interface BuyConfig {
  currencies: Currency[];
  fiatCurrencies: FiatCurrency[];
  paymentMethods: PaymentMethod[];
  platformFee: number;
}

export function ClientOrderWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  
  // Data from API
  const [config, setConfig] = useState<BuyConfig | null>(null);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [blockchainNetworks, setBlockchainNetworks] = useState<BlockchainNetwork[]>([]);
  const [tradingPairFee, setTradingPairFee] = useState<number>(0.015); // Default 1.5%

  // Form state
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [selectedFiat, setSelectedFiat] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [inputAmount, setInputAmount] = useState<string>(''); // Unified input
  const [inputMode, setInputMode] = useState<'crypto' | 'fiat'>('fiat'); // Toggle between crypto/fiat
  const [walletAddress, setWalletAddress] = useState<string>('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cryptoRes, fiatRes, blockchainRes, methodsRes] = await Promise.all([
          fetch('/api/admin/resources/currencies?active=true&includeBlockchains=true'),
          fetch('/api/admin/resources/fiat-currencies?active=true'),
          fetch('/api/blockchains?active=true'),
          fetch('/api/admin/payment-methods')
        ]);

        const [cryptoData, fiatData, blockchainData, methodsData] = await Promise.all([
          cryptoRes.json(),
          fiatRes.json(),
          blockchainRes.json(),
          methodsRes.json()
        ]);

        // Set cryptocurrencies
        if (cryptoData.success && Array.isArray(cryptoData.data)) {
          const currencies = cryptoData.data;
          setConfig(prev => ({
            currencies,
            fiatCurrencies: prev?.fiatCurrencies || [],
            paymentMethods: prev?.paymentMethods || [],
            platformFee: prev?.platformFee || 1.5
          }));
          
          if (currencies.length > 0) {
            setSelectedCrypto(currencies[0].code);
          }
        }

        // Set fiat currencies
        if (fiatData.success && Array.isArray(fiatData.data)) {
          const fiatCurrencies = fiatData.data;
          setConfig(prev => ({
            currencies: prev?.currencies || [],
            fiatCurrencies,
            paymentMethods: prev?.paymentMethods || [],
            platformFee: prev?.platformFee || 1.5
          }));
          
          if (fiatCurrencies.length > 0) {
            setSelectedFiat(fiatCurrencies[0].code);
          }
        }

        // Set blockchain networks
        if (blockchainData.success && Array.isArray(blockchainData.data)) {
          const activeNetworks = blockchainData.data.filter((n: BlockchainNetwork) => n.isActive);
          setBlockchainNetworks(activeNetworks);
        } else {
          setBlockchainNetworks([]);
        }

        // Set payment methods
        if (Array.isArray(methodsData.methods)) {
          const paymentMethods = methodsData.methods;
          setConfig(prev => ({
            currencies: prev?.currencies || [],
            fiatCurrencies: prev?.fiatCurrencies || [],
            paymentMethods,
            platformFee: prev?.platformFee || 1.5
          }));
          
          // Filter for IN/BOTH and client-available methods
          const availableMethods = paymentMethods.filter((m: any) => 
            m.isActive && 
            m.isAvailableForClients && 
            (m.direction === 'IN' || m.direction === 'BOTH')
          );
          
          if (availableMethods.length > 0) {
            setSelectedPaymentMethod(availableMethods[0].code);
            setSelectedFiat(availableMethods[0].currency);
          }
        }

      } catch (error) {
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch rates
  useEffect(() => {
    if (!selectedCrypto || !selectedFiat) return;

    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const response = await fetch('/api/rates');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setRates(data);
      } catch (error) {
        toast.error('Failed to load exchange rates');
      } finally {
        setRatesLoading(false);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30000); // Refresh every 30s
    
    return () => clearInterval(interval);
  }, [selectedCrypto, selectedFiat]);

  // Fetch trading pair fee
  useEffect(() => {
    const fetchTradingPairFee = async () => {
      if (!selectedCrypto || !selectedFiat) return;

      try {
        const response = await fetch(
          `/api/admin/trading-pairs?cryptoCode=${selectedCrypto}&fiatCode=${selectedFiat}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            setTradingPairFee(data.pairs[0].feePercent / 100);
          }
        }
      } catch (error) {
        // Silent fail for fee fetch
      }
    };

    fetchTradingPairFee();
  }, [selectedCrypto, selectedFiat]);

  // Get current rate
  const currentRate = rates && selectedCrypto && selectedFiat
    ? rates[selectedCrypto as keyof typeof rates]?.[selectedFiat as 'EUR' | 'PLN']
    : null;

  // Calculate crypto/fiat amounts based on input mode
  const cryptoAmount = useMemo(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0 || !currentRate) return '';
    
    if (inputMode === 'crypto') {
      return inputAmount;
    } else {
      // Calculate crypto from fiat
      const cryptoValue = amount / (currentRate * (1 + tradingPairFee));
      return cryptoValue.toFixed(8);
    }
  }, [inputAmount, inputMode, currentRate, tradingPairFee]);

  const fiatAmount = useMemo(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0 || !currentRate) return '';
    
    if (inputMode === 'fiat') {
      return inputAmount;
    } else {
      // Calculate fiat from crypto
      const fiatValue = amount * currentRate * (1 + tradingPairFee);
      return fiatValue.toFixed(2);
    }
  }, [inputAmount, inputMode, currentRate, tradingPairFee]);

  // Calculate order total
  const calculation = useMemo(() => {
    const crypto = parseFloat(cryptoAmount);
    if (!rates || !crypto || crypto <= 0 || !currentRate) return null;

    return calculateOrderTotal(crypto, currentRate, tradingPairFee);
  }, [cryptoAmount, currentRate, tradingPairFee, rates]);

  // Quick amount buttons - depends on input mode
  const quickAmounts = useMemo(() => {
    if (inputMode === 'crypto') {
      // Crypto amounts
      return selectedCrypto === 'BTC' 
        ? [0.001, 0.01, 0.1, 0.5]
        : [0.01, 0.1, 1, 10];
    } else {
      // Fiat amounts
      return [100, 500, 1000, 5000];
    }
  }, [inputMode, selectedCrypto]);

  // Get selected data
  const selectedCryptoData = config?.currencies.find(c => c.code === selectedCrypto);
  const selectedFiatData = config?.fiatCurrencies.find(f => f.code === selectedFiat);
  const selectedPaymentData = config?.paymentMethods.find(p => p.code === selectedPaymentMethod);

  // Create options
  const cryptoOptions = config?.currencies.map(crypto => ({
    value: crypto.code,
    label: `${crypto.name} (${crypto.code})`,
    description: crypto.symbol
  })) || [];

  const fiatOptions = config?.fiatCurrencies.map(fiat => ({
    value: fiat.code,
    label: `${fiat.name} (${fiat.code})`,
    description: fiat.symbol
  })) || [];

  const paymentOptions = config?.paymentMethods
    .filter(method => {
      // Only show IN or BOTH methods for buying
      const direction = ['IN', 'BOTH'];
      return method.direction && direction.includes(method.direction);
    })
    .map(method => ({
      value: method.code,
      label: method.name,
      description: method.description || `${method.type} payment`
    })) || [];

  const networkOptions = blockchainNetworks
    .filter(network => {
      const selectedCurrency = config?.currencies.find(c => c.code === selectedCrypto);
      
      if (!selectedCurrency || !selectedCurrency.blockchainNetworks) {
        return false;
      }
      
      // Check if this network is supported by the selected currency
      const isSupported = selectedCurrency.blockchainNetworks.some(
        bn => bn.blockchain.code === network.code
      );
      
      return isSupported;
    })
    .map(network => ({
      value: network.code,
      label: `${network.name} (${network.code})`,
      description: network.symbol || network.code
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      toast.error('Please enter your wallet address');
      return;
    }

    if (!selectedNetwork) {
      toast.error('Please select blockchain network');
      return;
    }

    if (!calculation) {
      toast.error('Unable to calculate order total');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currencyCode: selectedCrypto,
          fiatCurrencyCode: selectedFiat,
          cryptoAmount: parseFloat(cryptoAmount),
          walletAddress,
          paymentMethodCode: selectedPaymentMethod,
          blockchainCode: selectedNetwork
        })
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to create order');
        return;
      }

      toast.success('Order created successfully!', {
        description: `Reference: ${result.paymentReference}`
      });

      // Redirect to order details
      router.push(`/orders/${result.id}`);
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Buy Cryptocurrency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cryptocurrency Selection */}
          <div className="space-y-2">
            <Label>Cryptocurrency *</Label>
            <Combobox
              options={cryptoOptions}
              value={selectedCrypto}
              onValueChange={setSelectedCrypto}
              placeholder="Select cryptocurrency..."
            />
            {selectedCryptoData && (
              <p className="text-xs text-muted-foreground">
                Min: {selectedCryptoData.minOrderAmount} {selectedCrypto}, 
                Max: {selectedCryptoData.maxOrderAmount} {selectedCrypto}
              </p>
            )}
          </div>

          {/* Amount Input with Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Amount * 
                <Badge variant="outline" className="text-xs font-normal">
                  {inputMode === 'crypto' ? 'Crypto' : 'Fiat'}
                </Badge>
              </Label>
              {/* Quick amounts */}
              <div className="flex gap-1">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setInputAmount(amount.toString())}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input with Toggle Button */}
            <div className="relative">
              <Input
                type="number"
                step={inputMode === 'crypto' ? '0.00000001' : '0.01'}
                placeholder={inputMode === 'crypto' ? '0.00000000' : '0.00'}
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="h-16 text-2xl font-bold pr-32"
              />
              {/* Toggle Button inside input */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-3 flex items-center gap-2 font-semibold"
                onClick={() => {
                  setInputMode(prev => prev === 'crypto' ? 'fiat' : 'crypto');
                  // Keep the same value when switching
                }}
              >
                {inputMode === 'crypto' ? selectedCrypto : selectedFiat}
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Calculated opposite value */}
            {inputAmount && currentRate && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {inputMode === 'crypto' ? 'You pay' : 'You receive'}
                </span>
                <span className="text-sm font-semibold">
                  {inputMode === 'crypto' 
                    ? `≈ ${formatFiatCurrency(parseFloat(fiatAmount || '0'), selectedFiat)}`
                    : `≈ ${formatCryptoAmount(parseFloat(cryptoAmount || '0'), selectedCryptoData?.decimals || 8)} ${selectedCrypto}`
                  }
                </span>
              </div>
            )}

            {selectedCryptoData && (
              <p className="text-xs text-muted-foreground">
                Limits: {selectedCryptoData.minOrderAmount} - {selectedCryptoData.maxOrderAmount} {selectedCrypto}
              </p>
            )}
          </div>

          {/* Exchange Rate */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Exchange Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  {ratesLoading ? (
                    <Skeleton className="h-6 w-32" />
                  ) : currentRate ? (
                    <Badge variant="secondary" className="font-mono">
                      1 {selectedCrypto} = {formatFiatCurrency(currentRate, selectedFiat)}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Rate not available</Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      setRatesLoading(true);
                      try {
                        const response = await fetch('/api/rates?force=true');
                        
                        if (!response.ok) {
                          throw new Error(`HTTP ${response.status}`);
                        }
                        
                        const data = await response.json();
                        setRates(data);
                        toast.success('Rates updated', {
                          description: `Updated at ${new Date().toLocaleTimeString()}`
                        });
                      } catch (error) {
                        toast.error('Failed to refresh rates');
                      } finally {
                        setRatesLoading(false);
                      }
                    }}
                    disabled={ratesLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              {rates && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date(rates.updatedAt).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Combobox
              options={paymentOptions}
              value={selectedPaymentMethod}
              onValueChange={(value) => {
                setSelectedPaymentMethod(value);
                // Auto-fill fiat currency from payment method
                const method = config?.paymentMethods.find(m => m.code === value);
                if (method) {
                  setSelectedFiat(method.currency);
                }
              }}
              placeholder="Select payment method..."
            />
            {selectedPaymentData && (
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {selectedPaymentData.description || `Payment via ${selectedPaymentData.type}`}
                  {selectedPaymentData.minAmount && (
                    <span className="block mt-1 text-xs">
                      Min: {formatFiatCurrency(selectedPaymentData.minAmount, selectedFiat)} • 
                      Max: {selectedPaymentData.maxAmount 
                        ? formatFiatCurrency(selectedPaymentData.maxAmount, selectedFiat)
                        : 'No limit'}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Blockchain Network */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Blockchain Network *
              {networkOptions.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {networkOptions.length} available
                </Badge>
              )}
            </Label>
            <Combobox
              options={networkOptions}
              value={selectedNetwork}
              onValueChange={setSelectedNetwork}
              placeholder="Select blockchain network..."
              emptyText={
                !selectedCrypto 
                  ? "Select a cryptocurrency first" 
                  : blockchainNetworks.length === 0
                  ? "No blockchain networks configured"
                  : "No networks available for this currency"
              }
            />
            <p className="text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              Select the network your wallet supports
            </p>
            {networkOptions.length === 0 && selectedCrypto && blockchainNetworks.length > 0 && (
              <Alert className="mt-2" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No blockchain networks are configured for {selectedCrypto}. 
                  Please contact support or select a different cryptocurrency.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Your Wallet Address *
            </Label>
            <Input
              placeholder={`Enter your ${selectedCrypto} wallet address`}
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Cryptocurrency will be sent to this address after payment confirmation
            </p>
          </div>

          {/* Calculation Preview */}
          {calculation && (
            <>
              <Separator />
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Order Summary</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You will receive:</span>
                      <span className="font-medium">
                        {formatCryptoAmount(parseFloat(cryptoAmount), selectedCryptoData?.decimals || 8)} {selectedCrypto}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        {formatFiatCurrency(calculation.fiatAmount, selectedFiat)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Platform Fee ({(tradingPairFee * 100).toFixed(1)}%):
                      </span>
                      <span className="font-medium">
                        {formatFiatCurrency(calculation.fee, selectedFiat)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total to Pay:</span>
                      <span className="text-primary">
                        {formatFiatCurrency(calculation.totalFiat, selectedFiat)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Submit Button */}
          <Button 
            type="submit"
            size="lg" 
            className="w-full h-12"
            disabled={submitting || !calculation || !walletAddress || !selectedNetwork}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                Continue to Payment
                <ChevronRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The exchange rate is updated every 30 seconds and may change before payment confirmation. 
              You will receive bank transfer details after placing the order.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}

