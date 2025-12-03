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
    <div className="space-y-4">
      {/* Back button */}
      <Link href="/admin/virtual-iban">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Virtual IBANs
        </Button>
      </Link>

      {/* Header content */}
      <div className="flex items-start justify-between">
        {/* Left: Info */}
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 rounded-lg border-4 border-background shadow-lg bg-primary/10 flex items-center justify-center">
            <Landmark className="h-12 w-12 text-primary" />
          </div>

          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{account.bankName}</h1>
              <p className="text-lg text-muted-foreground">{account.accountHolder}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="text-lg">{getCountryFlag(account.country)}</span>
                {getCountryName(account.country)}
              </span>
              <span>•</span>
              <span>{account.currency}</span>
              <span>•</span>
              <span>Created {formatDateTime(account.createdAt)}</span>
            </div>

            {/* IBAN & BIC */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">IBAN:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {account.iban}
                </code>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyIban}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {account.bic && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">BIC:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                    {account.bic}
                  </code>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyBic}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>

              <Badge variant="secondary" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {account.providerId}
              </Badge>

              <Badge variant="outline" className="text-xs">
                {formatCurrency(account.balance, account.currency)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreVertical className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Account
            </DropdownMenuItem>

            <DropdownMenuItem onClick={copyIban}>
              <Copy className="h-4 w-4 mr-2" />
              Copy IBAN
            </DropdownMenuItem>

            {account.bic && (
              <DropdownMenuItem onClick={copyBic}>
                <Copy className="h-4 w-4 mr-2" />
                Copy BIC
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {account.status === 'ACTIVE' && (
              <DropdownMenuItem onClick={onSuspend} className="text-destructive">
                <Ban className="h-4 w-4 mr-2" />
                Suspend Account
              </DropdownMenuItem>
            )}

            {account.status === 'SUSPENDED' && (
              <DropdownMenuItem onClick={onReactivate}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactivate Account
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {account.status !== 'CLOSED' && (
              <DropdownMenuItem onClick={() => setCloseDialogOpen(true)} className="text-destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Close Account
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${account.user.id}`}>
                View User Profile
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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





