/**
 * WalletDetailsSheet Component
 * 
 * Quick view for wallet details with actions
 */

'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  User, 
  Network, 
  Calendar, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  Star,
  Copy,
  ShieldCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface UserWallet {
  id: string;
  userId: string;
  blockchainCode: string;
  currencyCode: string;
  address: string;
  label?: string | null;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    } | null;
  };
  blockchain: {
    code: string;
    name: string;
    explorerUrl: string;
  };
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  _count?: {
    orders: number;
  };
}

interface WalletDetailsSheetProps {
  wallet: UserWallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify?: (walletId: string) => void;
  onSetDefault?: (walletId: string) => void;
}

export function WalletDetailsSheet({
  wallet,
  open,
  onOpenChange,
  onVerify,
  onSetDefault
}: WalletDetailsSheetProps): JSX.Element {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  if (!wallet) return <></>;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleVerify = async () => {
    if (!onVerify) return;
    setIsVerifying(true);
    try {
      await onVerify(wallet.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetDefault = async () => {
    if (!onSetDefault) return;
    setIsSettingDefault(true);
    try {
      await onSetDefault(wallet.id);
    } finally {
      setIsSettingDefault(false);
    }
  };

  const viewInExplorer = () => {
    if (wallet.blockchain.explorerUrl) {
      const url = `${wallet.blockchain.explorerUrl}/address/${wallet.address}`;
      window.open(url, '_blank');
    }
  };

  const viewUser = () => {
    window.open(`/admin/users/${wallet.userId}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Details
          </SheetTitle>
          <SheetDescription>
            Detailed information and actions for this wallet
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={wallet.isVerified ? 'default' : 'secondary'}>
              {wallet.isVerified ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Unverified
                </>
              )}
            </Badge>
            {wallet.isDefault && (
              <Badge variant="outline">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Default
              </Badge>
            )}
            {wallet._count && wallet._count.orders > 0 && (
              <Badge variant="outline">
                {wallet._count.orders} Order{wallet._count.orders !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Wallet Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Wallet Information</h3>
            
            {/* Address */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                  {wallet.address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(wallet.address, 'Address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Label */}
            {wallet.label && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Label</p>
                <p className="text-sm font-medium">{wallet.label}</p>
              </div>
            )}

            {/* Currency */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Currency</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {wallet.currency.symbol} {wallet.currency.code}
                </Badge>
                <span className="text-sm">{wallet.currency.name}</span>
              </div>
            </div>

            {/* Blockchain */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Blockchain Network</p>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {wallet.blockchain.code} - {wallet.blockchain.name}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* User Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">User Information</h3>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{wallet.user.email}</p>
            </div>

            {wallet.user.profile && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-sm font-medium">
                  {wallet.user.profile.firstName} {wallet.user.profile.lastName}
                </p>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={viewUser}>
              <User className="h-4 w-4 mr-2" />
              View User Profile
            </Button>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold">Timeline</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(wallet.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(wallet.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold">Actions</h3>
            
            <div className="flex flex-col gap-2">
              {!wallet.isVerified && onVerify && (
                <Button
                  variant="outline"
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {isVerifying ? 'Verifying...' : 'Mark as Verified'}
                </Button>
              )}

              {!wallet.isDefault && onSetDefault && (
                <Button
                  variant="outline"
                  onClick={handleSetDefault}
                  disabled={isSettingDefault}
                >
                  <Star className="h-4 w-4 mr-2" />
                  {isSettingDefault ? 'Setting...' : 'Set as Default'}
                </Button>
              )}

              {wallet.blockchain.explorerUrl && (
                <Button
                  variant="outline"
                  onClick={viewInExplorer}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Explorer
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

