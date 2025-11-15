/**
 * WalletsTab
 * 
 * Displays user's crypto wallets with:
 * - Wallet addresses
 * - Currency and blockchain info
 * - Default wallet indicator
 * - Verification status
 * - Orders count
 * - Quick actions
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Wallet, Copy, CheckCircle, Star, ShoppingCart, ExternalLink, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/formatters';

interface WalletData {
  id: string;
  address: string;
  label: string | null;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  currency: { 
    code: string;
    symbol: string;
    name: string;
  };
  blockchain: { 
    name: string;
    code: string;
    explorerUrl: string;
  };
  _count?: {
    orders: number;
  };
}

interface WalletsTabProps {
  wallets: WalletData[];
}

export function WalletsTab({ wallets }: WalletsTabProps): JSX.Element {
  const handleCopyAddress = (address: string): void => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const handleViewInExplorer = (explorerUrl: string, address: string): void => {
    if (explorerUrl) {
      window.open(`${explorerUrl}/address/${address}`, '_blank');
    }
  };

  // Calculate stats
  const verifiedCount = wallets.filter(w => w.isVerified).length;
  const defaultCount = wallets.filter(w => w.isDefault).length;
  const totalOrders = wallets.reduce((sum, w) => sum + (w._count?.orders || 0), 0);

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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Wallets</p>
                <p className="text-2xl font-bold">{wallets.length}</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{verifiedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Default</p>
                <p className="text-2xl font-bold">{defaultCount}</p>
              </div>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets List */}
      <div className="grid grid-cols-1 gap-4">
        {wallets.map((wallet, index) => (
          <Card key={wallet.id} className={wallet.isDefault ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <CardTitle className="text-base">
                      {wallet.label || `Wallet ${index + 1}`}
                    </CardTitle>
                    {wallet.isDefault && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </Badge>
                    )}
                    {wallet.isVerified ? (
                      <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {wallet.currency.symbol} {wallet.currency.code}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {wallet.blockchain.code}
                    </Badge>
                    {wallet._count && wallet._count.orders > 0 && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {wallet._count.orders} order{wallet._count.orders !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
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
                  <p className="text-sm font-medium">{wallet.currency.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Network</p>
                  <p className="text-sm font-medium">{wallet.blockchain.name}</p>
                </div>
              </div>

              {/* Added Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Added</p>
                  <p className="text-sm font-medium">{formatDateTime(wallet.createdAt)}</p>
                </div>
                {wallet._count && wallet._count.orders > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-sm font-medium">{wallet._count.orders}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {wallet.blockchain.explorerUrl && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInExplorer(wallet.blockchain.explorerUrl, wallet.address)}
                    className="w-full"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View in Block Explorer
                  </Button>
                </>
              )}
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

