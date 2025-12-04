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
import { cn } from '@/lib/utils';
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
  User,
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
  const [copiedField, setCopiedField] = useState<'iban' | 'bic' | null>(null);

  const fullName = account.user.profile 
    ? `${account.user.profile.firstName} ${account.user.profile.lastName}` 
    : 'Unknown User';

  // Format IBAN with spaces for better readability (e.g., DK96 8990 0025 3329 304)
  const formatIban = (iban: string): string => {
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  const copyIban = () => {
    navigator.clipboard.writeText(account.iban);
    setCopiedField('iban');
    toast.success('IBAN copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyBic = () => {
    if (account.bic) {
      navigator.clipboard.writeText(account.bic);
      setCopiedField('bic');
      toast.success('BIC copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
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

      {/* Main Header Card - Clean & Focused */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-6 p-6">
          {/* Left: Bank Identity */}
          <div className="flex items-start gap-5 flex-1 min-w-0">
            {/* Bank Icon */}
            <div className="h-16 w-16 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
              <Landmark className="h-8 w-8 text-primary" />
            </div>

            {/* Bank Info */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Bank Name + Status Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight truncate">
                    {account.bankName}
                  </h1>
                  <p className="text-base text-muted-foreground mt-0.5 truncate">
                    {account.accountHolder}
                  </p>
                </div>
                
                {/* Status Badge */}
                <Badge 
                  variant={config.variant} 
                  className="text-sm font-semibold px-4 py-1.5 flex-shrink-0 shadow-sm"
                >
                  {config.label}
                </Badge>
              </div>

              {/* Location Info */}
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="text-xl">{getCountryFlag(account.country)}</span>
                  {getCountryName(account.country)}
                </span>
                <span className="text-muted-foreground/50">•</span>
                <Badge variant="outline" className="font-mono font-semibold">
                  {account.currency}
                </Badge>
              </div>

              {/* IBAN & BIC - Premium Banking Card Style */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
                {/* IBAN Row */}
                <div className="relative group">
                  <div className="flex items-center gap-4 p-4 transition-all hover:bg-white/5">
                    {/* Label */}
                    <div className="flex items-center gap-2 w-16 flex-shrink-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Landmark className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">IBAN</span>
                    </div>
                    
                    {/* IBAN Value */}
                    <div className="flex-1 min-w-0">
                      <code className="text-base font-semibold text-white tracking-[0.15em] block">
                        {formatIban(account.iban)}
                      </code>
                      <p className="text-xs text-slate-500 mt-0.5">
                        International Bank Account Number
                      </p>
                    </div>
                    
                    {/* Copy Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyIban}
                      className={cn(
                        "h-9 px-3 text-white hover:bg-white/10 hover:text-primary transition-all",
                        copiedField === 'iban' && "bg-green-500/20 text-green-400"
                      )}
                    >
                      {copiedField === 'iban' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          <span className="text-xs font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          <span className="text-xs font-medium">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
                </div>
                
                {/* BIC Row */}
                {account.bic && (
                  <div className="relative group">
                    <div className="flex items-center gap-4 p-4 transition-all hover:bg-white/5">
                      {/* Label */}
                      <div className="flex items-center gap-2 w-16 flex-shrink-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">BIC</span>
                      </div>
                      
                      {/* BIC Value */}
                      <div className="flex-1 min-w-0">
                        <code className="text-base font-semibold text-white tracking-[0.2em] block">
                          {account.bic}
                        </code>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Bank Identifier Code (SWIFT)
                        </p>
                      </div>
                      
                      {/* Copy Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyBic}
                        className={cn(
                          "h-9 px-3 text-white hover:bg-white/10 hover:text-blue-400 transition-all",
                          copiedField === 'bic' && "bg-green-500/20 text-green-400"
                        )}
                      >
                        {copiedField === 'bic' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            <span className="text-xs font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" />
                            <span className="text-xs font-medium">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions Button */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="lg" className="shadow-md hover:shadow-lg transition-all">
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
                    <User className="h-4 w-4 mr-3" />
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





