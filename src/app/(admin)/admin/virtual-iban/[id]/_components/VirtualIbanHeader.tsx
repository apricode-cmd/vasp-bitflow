/**
 * VirtualIbanHeader Component
 * 
 * Header для детальной страницы Virtual IBAN счёта
 * Переиспользует паттерн из UserHeader
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MoreVertical,
  Copy,
  RefreshCw,
  Ban,
  CheckCircle,
  Landmark,
  Building2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CloseAccountDialog } from '@/components/features/virtual-iban/CloseAccountDialog';

interface VirtualIbanHeaderProps {
  account: {
    id: string;
    iban: string;
    bic: string | null;
    bankName: string;
    accountHolder: string;
    currency: string;
    country: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING' | 'FAILED';
    balance: number;
    providerId: string;
    createdAt: Date;
    lastBalanceUpdate: Date | null;
    user: {
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        country: string;
      } | null;
    };
  };
  onSync: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}

export function VirtualIbanHeader({ 
  account, 
  onSync, 
  onSuspend, 
  onReactivate 
}: VirtualIbanHeaderProps): JSX.Element {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const fullName = account.user.profile 
    ? `${account.user.profile.firstName} ${account.user.profile.lastName}` 
    : 'Unknown User';

  const copyIban = () => {
    navigator.clipboard.writeText(account.iban);
    toast.success('IBAN copied to clipboard');
  };

  const copyBic = () => {
    if (account.bic) {
      navigator.clipboard.writeText(account.bic);
      toast.success('BIC copied to clipboard');
    }
  };

  const statusConfig = {
    ACTIVE: { variant: 'success' as const, label: '🟢 Active' },
    SUSPENDED: { variant: 'warning' as const, label: '⚠️ Suspended' },
    CLOSED: { variant: 'destructive' as const, label: '🔴 Closed' },
    PENDING: { variant: 'secondary' as const, label: '⏳ Pending' },
    FAILED: { variant: 'destructive' as const, label: '❌ Failed' },
  };

  const config = statusConfig[account.status] || { variant: 'default' as const, label: account.status };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/admin/virtual-iban">
        <Button variant="ghost" size="sm" className="hover:bg-accent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Virtual IBANs
        </Button>
      </Link>

      {/* Main Header Card */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Bank Info & User */}
          <div className="flex items-start gap-6 flex-1 min-w-0">
            {/* Bank Icon */}
            <div className="h-20 w-20 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
              <Landmark className="h-10 w-10 text-primary" />
            </div>

            {/* Info */}
            <div className="space-y-3 flex-1 min-w-0">
              {/* Bank Name + Status */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">
                    {account.bankName}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {account.accountHolder}
                  </p>
                </div>
                
                {/* Status Badge (prominent) */}
                <Badge 
                  variant={config.variant} 
                  className="text-sm font-semibold px-3 py-1 flex-shrink-0"
                >
                  {config.label}
                </Badge>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-base">{getCountryFlag(account.country)}</span>
                  {getCountryName(account.country)}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-mono font-semibold">{account.currency}</span>
                <span className="text-muted-foreground/40">•</span>
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {account.providerId}
                </Badge>
              </div>

              {/* IBAN & BIC in Card */}
              <div className="bg-background/60 backdrop-blur border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-12">IBAN</span>
                  <code className="text-sm font-mono bg-muted/50 px-3 py-1.5 rounded flex-1 tracking-wide">
                    {account.iban}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" 
                    onClick={copyIban}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {account.bic && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-12">BIC</span>
                    <code className="text-sm font-mono bg-muted/50 px-3 py-1.5 rounded flex-1 tracking-wide">
                      {account.bic}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" 
                      onClick={copyBic}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Balance + Created */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Balance:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                </div>
                <span className="text-muted-foreground/40">•</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Created {formatDateTime(account.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions Button */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                  <MoreVertical className="h-5 w-5 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-sm font-semibold">Account Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onSync} className="cursor-pointer">
                  <RefreshCw className="h-4 w-4 mr-3" />
                  Sync Account Details
                </DropdownMenuItem>

                <DropdownMenuItem onClick={copyIban} className="cursor-pointer">
                  <Copy className="h-4 w-4 mr-3" />
                  Copy IBAN
                </DropdownMenuItem>

                {account.bic && (
                  <DropdownMenuItem onClick={copyBic} className="cursor-pointer">
                    <Copy className="h-4 w-4 mr-3" />
                    Copy BIC
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {account.status === 'ACTIVE' && (
                  <DropdownMenuItem onClick={onSuspend} className="text-orange-600 dark:text-orange-400 cursor-pointer">
                    <Ban className="h-4 w-4 mr-3" />
                    Suspend Account
                  </DropdownMenuItem>
                )}

                {account.status === 'SUSPENDED' && (
                  <DropdownMenuItem onClick={onReactivate} className="text-green-600 dark:text-green-400 cursor-pointer">
                    <CheckCircle className="h-4 w-4 mr-3" />
                    Reactivate Account
                  </DropdownMenuItem>
                )}

                {account.status !== 'CLOSED' && account.status !== 'FAILED' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCloseDialogOpen(true)} className="text-destructive cursor-pointer">
                      <XCircle className="h-4 w-4 mr-3" />
                      Close Account
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/admin/users/${account.user.email}`} className="flex items-center">
                    <Building2 className="h-4 w-4 mr-3" />
                    View User Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Close Account Dialog */}
      <CloseAccountDialog
        accountId={account.id}
        iban={account.iban}
        balance={account.balance || 0}
        currency={account.currency}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onSuccess={() => {
          toast.success('Account closed successfully');
          window.location.reload();
        }}
        isAdmin={true}
      />
    </div>
  );
}





