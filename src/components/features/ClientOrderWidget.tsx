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

interface UserWallet {
  id: string;
  currencyCode: string;
  blockchainCode: string;
  address: string;
  label: string | null;
  currency: { code: string; name: string; symbol: string };
  blockchain: { code: string; name: string };
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

interface TradingPair {
  id: string;
  cryptoCode: string;
  fiatCode: string;
  isActive: boolean;
  minCryptoAmount: number;
  maxCryptoAmount: number;
  minFiatAmount: number;
  maxFiatAmount: number;
  feePercent: number;
  priority: number;
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
  const [tradingPair, setTradingPair] = useState<TradingPair | null>(null); // Current trading pair
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]); // User's saved wallets

  // Order limits (for non-KYC users)
  const [limitInfo, setLimitInfo] = useState<{
    used: number;
    limit: number;
    remaining: number;
    isKycApproved: boolean;
    kycRequired: boolean;
  } | null>(null);

  // Form state
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [selectedFiat, setSelectedFiat] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [inputAmount, setInputAmount] = useState<string>(''); // Unified input
  const [inputMode, setInputMode] = useState<'crypto' | 'fiat'>('fiat'); // Toggle between crypto/fiat
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('new'); // 'new' or wallet ID

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cryptoRes, fiatRes, blockchainRes, methodsRes, walletsRes, limitRes] = await Promise.all([
          fetch('/api/admin/resources/currencies?active=true&includeBlockchains=true'),
          fetch('/api/admin/resources/fiat-currencies?active=true'),
          fetch('/api/blockchains?active=true'),
          fetch('/api/admin/payment-methods'),
          fetch('/api/wallets'),
          fetch('/api/orders/limit-check')
        ]);

        const [cryptoData, fiatData, blockchainData, methodsData, walletsData, limitData] = await Promise.all([
          cryptoRes.json(),
          fiatRes.json(),
          blockchainRes.json(),
          methodsRes.json(),
          walletsRes.json(),
          limitRes.json()
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

        // Set user wallets
        if (walletsData.wallets && Array.isArray(walletsData.wallets)) {
          setUserWallets(walletsData.wallets);
        }

        // Set limit info
        if (limitData.success) {
          setLimitInfo(limitData.data);
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
          const error = await response.json();
          throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setRates(data);
      } catch (error: any) {
        console.error('Failed to load rates:', error);
        toast.error('Failed to load exchange rates', {
          description: error.message || 'Please check CoinGecko integration'
        });
        setRates(null); // Clear rates on error
      } finally {
        setRatesLoading(false);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30000); // Refresh every 30s
    
    return () => clearInterval(interval);
  }, [selectedCrypto, selectedFiat]);

  // Fetch trading pair data (limits + fee)
  useEffect(() => {
    const fetchTradingPair = async () => {
      if (!selectedCrypto || !selectedFiat) {
        setTradingPair(null);
        return;
      }

      try {
        const response = await fetch(
          `/api/trading-pairs?cryptoCode=${selectedCrypto}&fiatCode=${selectedFiat}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.pair) {
            setTradingPair(data.pair);
          } else {
            setTradingPair(null);
            console.warn('No trading pair found for', selectedCrypto, selectedFiat);
          }
        } else {
          setTradingPair(null);
        }
      } catch (error) {
        console.error('Failed to fetch trading pair:', error);
        setTradingPair(null);
      }
    };

    fetchTradingPair();
  }, [selectedCrypto, selectedFiat]);

  // Auto-select blockchain and wallet when crypto changes
  useEffect(() => {
    if (!selectedCrypto || !config) return;

    const selectedCurrency = config.currencies.find(c => c.code === selectedCrypto);
    if (!selectedCurrency?.blockchainNetworks) return;

    const availableBlockchains = selectedCurrency.blockchainNetworks
      .filter(bn => bn.blockchain.isActive)
      .map(bn => bn.blockchain.code);

    // Auto-select first blockchain if only one available
    if (availableBlockchains.length === 1) {
      setSelectedNetwork(availableBlockchains[0]);
    } else if (availableBlockchains.length > 1) {
      // Select first blockchain by default
      setSelectedNetwork(availableBlockchains[0]);
    } else {
      setSelectedNetwork('');
    }

    // Try to find a saved wallet for this crypto
    const matchingWallets = userWallets.filter(w => 
      w.currencyCode === selectedCrypto && 
      availableBlockchains.includes(w.blockchainCode)
    );

    if (matchingWallets.length > 0) {
      // Auto-select first matching wallet
      setSelectedWalletId(matchingWallets[0].id);
      setWalletAddress(matchingWallets[0].address);
      setSelectedNetwork(matchingWallets[0].blockchainCode);
    } else {
      // Reset to "new" if no matching wallet
      setSelectedWalletId('new');
      setWalletAddress('');
    }
  }, [selectedCrypto, config, userWallets]);

  // Update wallet address when selected wallet changes
  useEffect(() => {
    if (selectedWalletId === 'new') {
      setWalletAddress('');
      return;
    }

    const selectedWallet = userWallets.find(w => w.id === selectedWalletId);
    if (selectedWallet) {
      setWalletAddress(selectedWallet.address);
      setSelectedNetwork(selectedWallet.blockchainCode);
    }
  }, [selectedWalletId, userWallets]);

  // Get current rate
  const currentRate = rates && selectedCrypto && selectedFiat
    ? rates[selectedCrypto as keyof typeof rates]?.[selectedFiat as 'EUR' | 'PLN']
    : null;

  // Calculate crypto/fiat amounts based on input mode
  const cryptoAmount = useMemo(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0 || !currentRate || !tradingPair) return '';
    
    const feeDecimal = tradingPair.feePercent / 100;
    
    if (inputMode === 'crypto') {
      return inputAmount;
    } else {
      // Calculate crypto from fiat
      const cryptoValue = amount / (currentRate * (1 + feeDecimal));
      return cryptoValue.toFixed(8);
    }
  }, [inputAmount, inputMode, currentRate, tradingPair]);

  const fiatAmount = useMemo(() => {
    const amount = parseFloat(inputAmount);
    if (!amount || amount <= 0 || !currentRate || !tradingPair) return '';
    
    const feeDecimal = tradingPair.feePercent / 100;
    
    if (inputMode === 'fiat') {
      return inputAmount;
    } else {
      // Calculate fiat from crypto
      const fiatValue = amount * currentRate * (1 + feeDecimal);
      return fiatValue.toFixed(2);
    }
  }, [inputAmount, inputMode, currentRate, tradingPair]);

  // Calculate order total
  const calculation = useMemo(() => {
    const crypto = parseFloat(cryptoAmount);
    if (!rates || !crypto || crypto <= 0 || !currentRate || !tradingPair) return null;

    // Use fee from TradingPair (convert from percent to decimal)
    const feeDecimal = tradingPair.feePercent / 100;
    return calculateOrderTotal(crypto, currentRate, feeDecimal);
  }, [cryptoAmount, currentRate, tradingPair, rates]);

  // Quick amount buttons - dynamic based on trading pair limits
  const quickAmounts = useMemo(() => {
    if (!tradingPair) {
      // Fallback if no trading pair
      return inputMode === 'crypto' 
        ? [0.001, 0.01, 0.1, 0.5]
        : [100, 500, 1000, 5000];
    }

    if (inputMode === 'crypto') {
      // Crypto amounts based on min/max
      const min = tradingPair.minCryptoAmount;
      const max = tradingPair.maxCryptoAmount;
      
      return [
        min,                    // Minimum
        min * 10,               // 10x minimum
        min * 100,              // 100x minimum
        Math.min(min * 500, max) // 500x minimum or max
      ].filter(amount => amount <= max);
    } else {
      // Fiat amounts based on min/max
      const min = tradingPair.minFiatAmount;
      const max = tradingPair.maxFiatAmount;
      
      return [
        min,                           // Minimum
        Math.min(min * 5, max),        // 5x minimum
        Math.min(min * 10, max),       // 10x minimum
        Math.min(min * 50, max)        // 50x minimum
      ].filter(amount => amount <= max);
    }
  }, [inputMode, tradingPair]);

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
      
      // Check if this network is supported by the selected currency AND is active
      const supportedNetwork = selectedCurrency.blockchainNetworks.find(
        bn => bn.blockchain.code === network.code
      );
      
      // Must be supported AND active in CurrencyBlockchainNetwork
      return supportedNetwork && supportedNetwork.blockchain.isActive;
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

    // Validate amounts against trading pair limits
    if (tradingPair) {
      const crypto = parseFloat(cryptoAmount);
      const fiat = parseFloat(fiatAmount);

      if (crypto < tradingPair.minCryptoAmount) {
        toast.error(`Minimum order: ${tradingPair.minCryptoAmount} ${selectedCrypto}`);
        return;
      }

      if (crypto > tradingPair.maxCryptoAmount) {
        toast.error(`Maximum order: ${tradingPair.maxCryptoAmount} ${selectedCrypto}`);
        return;
      }

      if (fiat < tradingPair.minFiatAmount) {
        toast.error(`Minimum order: ${formatFiatCurrency(tradingPair.minFiatAmount, selectedFiat)}`);
        return;
      }

      if (fiat > tradingPair.maxFiatAmount) {
        toast.error(`Maximum order: ${formatFiatCurrency(tradingPair.maxFiatAmount, selectedFiat)}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Validate wallet address before creating order
      if (selectedWalletId === 'new' && walletAddress) {
        const validateRes = await fetch('/api/wallets/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: walletAddress,
            blockchainCode: selectedNetwork,
            currencyCode: selectedCrypto
          })
        });

        const validateData = await validateRes.json();

        if (!validateData.isValid) {
          toast.error(validateData.error || 'Invalid wallet address');
          setSubmitting(false);
          return;
        }

        // If wallet is not already saved and valid, save it
        if (!validateData.alreadySaved) {
          try {
            const saveWalletRes = await fetch('/api/wallets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                currencyCode: selectedCrypto,
                blockchainCode: selectedNetwork,
                address: walletAddress
              })
            });

            if (saveWalletRes.ok) {
              const savedWallet = await saveWalletRes.json();
              // Update local state
              setUserWallets(prev => [savedWallet, ...prev]);
              toast.success('Wallet address saved for future use');
            }
          } catch (error) {
            // Non-critical error, continue with order creation
            console.error('Failed to save wallet:', error);
          }
        }
      }

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
        {/* 24h Trading Limit Alert (for non-KYC users) */}
        {limitInfo && !limitInfo.isKycApproved && !limitInfo.kycRequired && (
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="space-y-2">
              <p className="font-medium text-foreground">
                24-Hour Trading Limit (Without KYC)
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-semibold text-primary">
                    {formatFiatCurrency(limitInfo.remaining, selectedFiat || 'EUR')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Used: {formatFiatCurrency(limitInfo.used, selectedFiat || 'EUR')}
                  </span>
                  <span className="text-muted-foreground">
                    Limit: {formatFiatCurrency(limitInfo.limit, selectedFiat || 'EUR')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Complete <a href="/kyc" className="text-primary hover:underline">KYC verification</a> to remove trading limits
              </p>
            </AlertDescription>
          </Alert>
        )}

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
            {tradingPair && (
              <p className="text-xs text-muted-foreground">
                Limits: {inputMode === 'crypto' 
                  ? `${tradingPair.minCryptoAmount} - ${tradingPair.maxCryptoAmount} ${selectedCrypto}`
                  : `${formatFiatCurrency(tradingPair.minFiatAmount, selectedFiat)} - ${formatFiatCurrency(tradingPair.maxFiatAmount, selectedFiat)}`
                }
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

            {tradingPair && (
              <p className="text-xs text-muted-foreground">
                Limits: {inputMode === 'crypto' 
                  ? `${tradingPair.minCryptoAmount} - ${tradingPair.maxCryptoAmount} ${selectedCrypto}`
                  : `${formatFiatCurrency(tradingPair.minFiatAmount, selectedFiat)} - ${formatFiatCurrency(tradingPair.maxFiatAmount, selectedFiat)}`
                }
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
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Your Wallet Address *
            </Label>

            {/* Filter wallets for selected crypto and blockchain */}
            {(() => {
              const matchingWallets = userWallets.filter(w => 
                w.currencyCode === selectedCrypto && 
                (w.blockchainCode === selectedNetwork || !selectedNetwork)
              );

              return matchingWallets.length > 0 ? (
                <div className="space-y-3">
                  {/* Saved Wallets */}
                  <div className="space-y-2">
                    {matchingWallets.map((wallet) => (
                      <label
                        key={wallet.id}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${selectedWalletId === wallet.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="wallet"
                          value={wallet.id}
                          checked={selectedWalletId === wallet.id}
                          onChange={() => setSelectedWalletId(wallet.id)}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {wallet.label || `${wallet.currency.symbol} Wallet`}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {wallet.blockchain.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                            {wallet.address}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Add New Wallet Option */}
                  <label
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedWalletId === 'new' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-dashed border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="wallet"
                      value="new"
                      checked={selectedWalletId === 'new'}
                      onChange={() => setSelectedWalletId('new')}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">Use a different address</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter a new wallet address manually
                      </p>
                    </div>
                  </label>

                  {/* New Address Input (shown when "new" is selected) */}
                  {selectedWalletId === 'new' && (
                    <div className="pl-7 animate-in slide-in-from-top-2">
                      <Input
                        placeholder={`Enter your ${selectedCrypto} wallet address`}
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // No saved wallets - show input directly
                <Input
                  placeholder={`Enter your ${selectedCrypto} wallet address`}
                  value={walletAddress}
                  onChange={(e) => {
                    setWalletAddress(e.target.value);
                    setSelectedWalletId('new');
                  }}
                />
              );
            })()}

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
                        Platform Fee ({tradingPair?.feePercent.toFixed(1)}%):
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

