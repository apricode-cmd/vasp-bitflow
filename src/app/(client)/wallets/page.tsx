/**
 * Saved Wallets Page
 * 
 * Manage user's cryptocurrency wallet addresses
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Wallet, Plus, Trash2, CheckCircle2, Info
} from 'lucide-react';
import { AddWalletDialog } from '@/components/features/AddWalletDialog';
import { DeleteWalletDialog } from '@/components/features/DeleteWalletDialog';
import { CopyButton } from '@/components/ui/copy-button';
import { KycAlert } from '@/components/features/KycAlert';

export default async function WalletsPage(): Promise<React.ReactElement> {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get user wallets with blockchain and currency info
  const userWallets = await prisma.userWallet.findMany({
    where: { userId: session.user.id },
    include: {
      blockchain: true,
      currency: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get KYC status
  const kycSession = await prisma.kycSession.findUnique({
    where: { userId: session.user.id },
    select: { status: true }
  });

  const isKycApproved = kycSession?.status === 'APPROVED';

  // Group wallets by currency
  const walletsByCurrency = userWallets.reduce((acc, wallet) => {
    if (!acc[wallet.currencyCode]) {
      acc[wallet.currencyCode] = [];
    }
    acc[wallet.currencyCode].push(wallet);
    return acc;
  }, {} as Record<string, typeof userWallets>);

  return (
    <div className="space-y-6 animate-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">My Wallets</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Wallet Addresses</h1>
          <p className="text-muted-foreground mt-1">
            Manage your cryptocurrency wallet addresses for faster ordering
          </p>
        </div>
        <AddWalletDialog />
      </div>

      {/* KYC Alert - Reusable Component */}
      <KycAlert status={kycSession?.status || null} isApproved={isKycApproved} />

      {/* Info Alert */}
      <Alert className="bg-card/50 backdrop-blur-sm border-primary/20">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle>About Saved Wallets</AlertTitle>
        <AlertDescription>
          Save your cryptocurrency wallet addresses here for convenient reuse in future orders. 
          Make sure each address is correct and corresponds to the right blockchain network.
        </AlertDescription>
      </Alert>

      {/* Wallets by Currency */}
      {Object.keys(walletsByCurrency).length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Wallet className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No saved wallets yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Add your first cryptocurrency wallet address to speed up future orders.
              </p>
              <AddWalletDialog triggerVariant="default" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(walletsByCurrency).map(([currencyCode, wallets]) => {
            const currency = wallets[0]?.currency;
            
            return (
              <Card key={currencyCode} className="bg-card/50 backdrop-blur-sm border-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {currencyCode.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {currency?.name || currencyCode}
                          <Badge variant="secondary">{currencyCode}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {wallets.length} saved {wallets.length === 1 ? 'address' : 'addresses'}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {wallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              Network:
                            </p>
                            <Badge variant="outline">
                              {wallet.blockchain.name} ({wallet.blockchain.symbol})
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono truncate">
                              {wallet.address}
                            </p>
                            <CopyButton value={wallet.address} />
                          </div>
                          {wallet.label && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Label: {wallet.label}
                            </p>
                          )}
                        </div>
                        <DeleteWalletDialog 
                          walletId={wallet.id}
                          walletAddress={wallet.address}
                          currency={currencyCode}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Card */}
      {userWallets.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(walletsByCurrency).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currencies</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {userWallets.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Wallets</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {new Set(userWallets.map(w => w.blockchainCode)).size}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Networks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

