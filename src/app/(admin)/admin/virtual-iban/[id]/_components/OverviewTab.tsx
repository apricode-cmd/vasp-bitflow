/**
 * OverviewTab Component
 * 
 * Enhanced обзор информации о Virtual IBAN счёте
 * С улучшенной группировкой и визуализацией
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { 
  Building2, 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  Landmark,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface OverviewTabProps {
  account: {
    id: string;
    iban: string;
    bic: string | null;
    bankName: string;
    accountHolder: string;
    currency: string;
    country: string;
    status: string;
    balance: number;
    providerId: string;
    providerAccountId: string;
    createdAt: Date;
    updatedAt: Date;
    lastBalanceUpdate: Date | null;
    suspendedAt: Date | null;
    suspendedBy: string | null;
    suspendReason: string | null;
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        country: string;
        phoneNumber: string | null;
      } | null;
    };
  };
}

export function OverviewTab({ account }: OverviewTabProps): JSX.Element {
  const fullName = account.user.profile 
    ? `${account.user.profile.firstName} ${account.user.profile.lastName}` 
    : 'Unknown User';

  // Status configuration
  const statusConfig = {
    ACTIVE: {
      icon: CheckCircle2,
      variant: 'success' as const,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    SUSPENDED: {
      icon: PauseCircle,
      variant: 'warning' as const,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    CLOSED: {
      icon: XCircle,
      variant: 'destructive' as const,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    PENDING: {
      icon: Clock,
      variant: 'secondary' as const,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    FAILED: {
      icon: AlertCircle,
      variant: 'destructive' as const,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
  };

  const statusDetails = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = statusDetails.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Account & User (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* IBAN & BIC */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">IBAN</p>
                  <code className="text-sm bg-muted/60 px-3 py-2 rounded-md font-mono block break-all">
                    {account.iban}
                  </code>
                </div>
              </div>
              
              {account.bic && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">BIC/SWIFT</p>
                    <code className="text-sm bg-muted/60 px-3 py-2 rounded-md font-mono block">
                      {account.bic}
                    </code>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Bank & Holder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Bank Name</p>
                <p className="font-semibold text-base">{account.bankName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Account Holder</p>
                <p className="font-semibold text-base">{account.accountHolder}</p>
              </div>
            </div>

            <Separator />

            {/* Currency & Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Currency</p>
                <Badge variant="outline" className="font-mono font-semibold text-sm">
                  {account.currency}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Bank Country</p>
                <p className="font-medium text-base">
                  <span className="text-xl mr-2">{getCountryFlag(account.country)}</span>
                  {getCountryName(account.country)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Balance (Prominent) */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-5 border border-primary/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Balance</p>
              <p className="text-3xl font-bold text-primary tracking-tight">
                {formatCurrency(account.balance, account.currency)}
              </p>
              {account.lastBalanceUpdate && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Last updated {formatDateTime(account.lastBalanceUpdate)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Account Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Full Name</p>
              <Link 
                href={`/admin/users/${account.user.id}`}
                className="font-semibold text-base text-primary hover:underline inline-flex items-center gap-1"
              >
                {fullName}
                <span className="text-xs">→</span>
              </Link>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Email Address
              </p>
              <p className="font-medium text-base">{account.user.email}</p>
            </div>

            {account.user.profile?.phoneNumber && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Phone Number</p>
                <p className="font-medium text-base font-mono">{account.user.profile.phoneNumber}</p>
              </div>
            )}

            {account.user.profile?.country && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  User Country
                </p>
                <p className="font-medium text-base">
                  <span className="text-xl mr-2">{getCountryFlag(account.user.profile.country)}</span>
                  {getCountryName(account.user.profile.country)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Status & Provider (1/3 width) */}
      <div className="space-y-6">
        {/* Account Status */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={cn("p-2 rounded-lg", statusDetails.bg)}>
                <StatusIcon className={cn("h-5 w-5", statusDetails.color)} />
              </div>
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Status</p>
              <Badge variant={statusDetails.variant} className="text-sm font-semibold">
                {account.status}
              </Badge>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </p>
              <p className="text-sm font-medium">{formatDateTime(account.createdAt)}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Last Updated
              </p>
              <p className="text-sm font-medium">{formatDateTime(account.updatedAt)}</p>
            </div>

            {account.suspendedAt && (
              <>
                <Separator />
                <div className={cn("rounded-lg p-3 space-y-2", statusDetails.bg)}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={cn("h-4 w-4", statusDetails.color)} />
                    <p className="text-xs font-semibold">Suspension Details</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{formatDateTime(account.suspendedAt)}</p>
                  </div>
                  {account.suspendReason && (
                    <div>
                      <p className="text-xs text-muted-foreground">Reason</p>
                      <p className="text-sm">{account.suspendReason}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Provider Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Provider Name</p>
              <Badge variant="secondary" className="text-sm font-semibold">
                {account.providerId}
              </Badge>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Provider Account ID</p>
              <code className="text-xs bg-muted/60 px-2 py-1.5 rounded font-mono block break-all">
                {account.providerAccountId}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





