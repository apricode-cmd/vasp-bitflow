/**
 * WalletsTab
 * 
 * Displays user's crypto wallets with:
 * - Wallet addresses
 * - Currency and blockchain info
 * - Default wallet indicator
 * - Verification status
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Wallet, Copy, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WalletData {
  id: string;
  address: string;
  label: string | null;
  isDefault: boolean;
  currency: { code: string };
  blockchain: { name: string };
}

interface WalletsTabProps {
  wallets: WalletData[];
}

export function WalletsTab({ wallets }: WalletsTabProps): JSX.Element {
  const handleCopyAddress = (address: string): void => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  if (!wallets || wallets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No wallets added yet
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            User hasn't added any crypto wallet addresses
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Crypto Wallets
              </CardTitle>
              <CardDescription>
                User's verified wallet addresses for receiving crypto
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {wallets.length}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Wallets List */}
      <div className="grid grid-cols-1 gap-4">
        {wallets.map((wallet, index) => (
          <Card key={wallet.id} className={wallet.isDefault ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base">
                      {wallet.label || `Wallet ${index + 1}`}
                    </CardTitle>
                    {wallet.isDefault && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {wallet.currency.code}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {wallet.blockchain.name}
                    </Badge>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Separator />
              
              {/* Wallet Address */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                    {wallet.address}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAddress(wallet.address)}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Wallet Details */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-sm font-medium">{wallet.currency.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blockchain</p>
                  <p className="text-sm font-medium">{wallet.blockchain.name}</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Verified wallet address</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Wallets</span>
            <span className="font-semibold">{wallets.length}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Supported Currencies</span>
            <span className="font-semibold">
              {[...new Set(wallets.map(w => w.currency.code))].join(', ')}
            </span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Blockchains</span>
            <span className="font-semibold">
              {[...new Set(wallets.map(w => w.blockchain.name))].join(', ')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

