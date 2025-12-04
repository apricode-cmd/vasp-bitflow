/**
 * Buy Cryptocurrency Page
 * 
 * Modern page with order widget and KYC verification check
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ClientOrderWidget } from '@/components/features/ClientOrderWidget';
import { KycAlert } from '@/components/features/KycAlert';
import { CurrencyDisplay } from '@/components/features/CurrencyIcon';
import { VirtualIbanCard } from '@/components/features/VirtualIbanCard';
import { 
  ShoppingCart, Shield, Lock, Zap, TrendingUp, CheckCircle2, Coins
} from 'lucide-react';
import Link from 'next/link';

interface UserKycStatus {
  status: string;
  isApproved: boolean;
  kycRequired: boolean; // From system settings
}

interface Currency {
  code: string;
  name: string;
  iconUrl: string | null;
}

export default function BuyPage(): React.ReactElement {
  const [kycStatus, setKycStatus] = useState<UserKycStatus | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const [kycRes, settingsRes, configRes] = await Promise.all([
        fetch('/api/kyc/status'),
        fetch('/api/settings/public'),
        fetch('/api/buy/config')
      ]);
      
      const kycData = await kycRes.json();
      const settingsData = await settingsRes.json();
      const configData = await configRes.json();
      
      setKycStatus({
        status: kycData.status || 'NOT_STARTED',
        isApproved: kycData.status === 'APPROVED',
        kycRequired: settingsData.settings?.kycRequired !== false // Default true if not set
      });
      
      // Load available currencies with icons
      if (configData.currencies && Array.isArray(configData.currencies)) {
        setCurrencies(configData.currencies.map((c: Currency) => ({
          code: c.code,
          name: c.name,
          iconUrl: c.iconUrl
        })));
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Buy Crypto with Fiat</h1>
              <p className="text-sm text-muted-foreground">
                Fast, secure bank transfer payments
              </p>
            </div>
          </div>
        </div>
        {kycStatus?.isApproved && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Verified</span>
          </div>
        )}
      </div>

      {/* KYC Alert - Reusable Component */}
      <KycAlert 
        status={kycStatus?.status || null} 
        isApproved={kycStatus?.isApproved || false} 
      />

      {/* Main Content - 2 Column Layout */}
      <div className="grid lg:grid-cols-[1fr,380px] gap-5">
        {/* Order Widget */}
        <div>
          {/* Show widget if:
              1. KYC is NOT required (kycRequired: false) OR
              2. KYC is approved */}
          {!kycStatus?.kycRequired || kycStatus?.isApproved ? (
            <ClientOrderWidget />
          ) : (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-10 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
                  <Lock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Trading Locked</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                  Complete your KYC verification to start buying cryptocurrency.
                </p>
                <Link href="/kyc">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    <Shield className="h-4 w-4 mr-2" />
                    Verify My Account
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Virtual IBAN Card */}
          {(!kycStatus?.kycRequired || kycStatus?.isApproved) && (
            <VirtualIbanCard compact />
          )}

          {/* Features */}
          <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Why Choose Us
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Fast Processing</h4>
                    <p className="text-xs text-muted-foreground">
                      Orders processed within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Secure & Safe</h4>
                    <p className="text-xs text-muted-foreground">
                      KYC verified and fully compliant
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Best Rates</h4>
                    <p className="text-xs text-muted-foreground">
                      Real-time market rates every 30s
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Cryptocurrencies */}
          {currencies.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Supported Cryptocurrencies
                </h3>
                <div className="space-y-3">
                  {currencies.map((currency) => (
                    <div 
                      key={currency.code}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <CurrencyDisplay
                        currencyCode={currency.code}
                        currencyName={currency.name}
                        iconUrl={currency.iconUrl}
                        showCode={false}
                        size="sm"
                      />
                      <Badge variant="secondary" className="text-xs">
                        {currency.code}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* How it Works */}
          <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                How It Works
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Enter Amount</h4>
                    <p className="text-xs text-muted-foreground">
                      Choose crypto and enter amount
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Select Payment</h4>
                    <p className="text-xs text-muted-foreground">
                      Choose payment method
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Bank Transfer</h4>
                    <p className="text-xs text-muted-foreground">
                      Transfer funds to our account
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">Receive Crypto</h4>
                    <p className="text-xs text-muted-foreground">
                      Get crypto in your wallet within 24h
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
