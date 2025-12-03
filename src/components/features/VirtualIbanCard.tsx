/**
 * Virtual IBAN Card Component
 * 
 * Displays user's Virtual IBAN account with:
 * - Current balance
 * - IBAN + BIC details
 * - Top-up instructions
 * - Quick actions (copy IBAN, view transactions)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Landmark, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  CreditCard,
  ArrowUpCircle,
  History,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface VirtualIbanAccount {
  id: string;
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
  currency: string;
  balance: number;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED' | 'FAILED';
  lastBalanceUpdate: string;
}

interface VirtualIbanCardProps {
  /**
   * Show compact version (for sidebar/widget)
   */
  compact?: boolean;
  /**
   * Auto-create IBAN if not exists
   */
  autoCreate?: boolean;
  /**
   * Callback when IBAN is created
   */
  onIbanCreated?: (account: VirtualIbanAccount) => void;
  /**
   * Additional class name
   */
  className?: string;
}

export function VirtualIbanCard({ 
  compact = false, 
  autoCreate = false,
  onIbanCreated,
  className 
}: VirtualIbanCardProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [account, setAccount] = useState<VirtualIbanAccount | null>(null);
  const [showFullIban, setShowFullIban] = useState(false);

  // Fetch Virtual IBAN account
  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async (): Promise<void> => {
    try {
      const response = await fetch('/api/client/virtual-iban');
      const data = await response.json();

      if (response.ok && data.success && data.data.length > 0) {
        setAccount(data.data[0]); // User has only one IBAN account
      } else if (autoCreate && data.data.length === 0) {
        // Auto-create if enabled
        await handleCreateIban();
      }
    } catch (error) {
      console.error('Failed to fetch Virtual IBAN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIban = async (): Promise<void> => {
    setCreating(true);
    try {
      const response = await fetch('/api/client/virtual-iban/create', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAccount(data.data);
        toast.success('Virtual IBAN created successfully!', {
          description: `Your IBAN: ${data.data.iban}`,
        });
        onIbanCreated?.(data.data);
      } else {
        toast.error(data.error || 'Failed to create Virtual IBAN');
      }
    } catch (error) {
      toast.error('An error occurred while creating Virtual IBAN');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyIban = (): void => {
    if (!account) return;
    navigator.clipboard.writeText(account.iban);
    toast.success('IBAN copied to clipboard!');
  };

  const handleCopyBic = (): void => {
    if (!account) return;
    navigator.clipboard.writeText(account.bic);
    toast.success('BIC copied to clipboard!');
  };

  const maskIban = (iban: string): string => {
    if (iban.length < 8) return iban;
    return `${iban.substring(0, 4)} ${'*'.repeat(12)} ${iban.substring(iban.length - 4)}`;
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No account - show create button
  if (!account) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Virtual IBAN Account</CardTitle>
              <CardDescription>Get your personal IBAN for instant payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-1" />
              Instant top-up via bank transfer
            </p>
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-1" />
              Use balance to buy crypto instantly
            </p>
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-1" />
              Auto-reconciliation of payments
            </p>
          </div>

          <Button
            onClick={handleCreateIban}
            disabled={creating}
            className="w-full"
            size="lg"
          >
            {creating ? (
              <>Creating IBAN...</>
            ) : (
              <>
                <Landmark className="h-4 w-4 mr-2" />
                Get Virtual IBAN
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Account exists - show details
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  if (compact) {
    // Compact version for sidebar/widget
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <span className="font-semibold">IBAN Balance</span>
            </div>
            <Badge variant="outline" className={statusColors[account.status]}>
              {account.status}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(account.balance, account.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              Available for purchases
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href="/payment-details">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyIban}>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full version for main pages
  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Virtual IBAN Account</CardTitle>
              <CardDescription>Personal bank account for crypto purchases</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[account.status]}>
            {account.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Balance */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 space-y-2">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-4xl font-bold text-primary">
            {formatCurrency(account.balance, account.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(account.lastBalanceUpdate).toLocaleString()}
          </p>
        </div>

        {/* IBAN Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground">Account Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullIban(!showFullIban)}
            >
              {showFullIban ? (
                <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
              ) : (
                <><Eye className="h-4 w-4 mr-1" /> Show</>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {/* IBAN */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">IBAN</p>
                <p className="font-mono text-sm font-semibold">
                  {showFullIban ? account.iban : maskIban(account.iban)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyIban}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* BIC */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                <p className="font-mono text-sm font-semibold">{account.bic}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyBic}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Bank Name */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Bank Name</p>
              <p className="text-sm font-semibold mt-1">{account.bankName}</p>
            </div>

            {/* Account Holder */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Account Holder</p>
              <p className="text-sm font-semibold mt-1">{account.accountHolder}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="default" size="lg" asChild>
            <Link href="/payment-details">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Top Up Balance
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/payment-details#transactions">
              <History className="h-4 w-4 mr-2" />
              View Transactions
            </Link>
          </Button>
        </div>

        {/* Info Alert */}
        {account.balance < 10 && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Low Balance
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Top up your Virtual IBAN to make instant crypto purchases without waiting for bank transfers.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}





