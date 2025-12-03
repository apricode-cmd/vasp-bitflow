/**
 * OverviewTab Component
 * 
 * Обзор информации о Virtual IBAN счёте
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">IBAN</p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {account.iban}
              </code>
            </div>
            {account.bic && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">BIC/SWIFT</p>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {account.bic}
                </code>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
            <p className="font-medium">{account.bankName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Account Holder</p>
            <p className="font-medium">{account.accountHolder}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Currency</p>
              <p className="font-medium">{account.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Country</p>
              <p className="font-medium">
                {getCountryFlag(account.country)} {getCountryName(account.country)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(account.balance, account.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Owner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Full Name</p>
            <Link href={`/admin/users/${account.user.id}`}>
              <p className="font-medium text-primary hover:underline">{fullName}</p>
            </Link>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </p>
            <p className="font-medium">{account.user.email}</p>
          </div>

          {account.user.profile?.phoneNumber && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
              <p className="font-medium">{account.user.profile.phoneNumber}</p>
            </div>
          )}

          {account.user.profile?.country && (
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Country
              </p>
              <p className="font-medium">
                {getCountryFlag(account.user.profile.country)} {getCountryName(account.user.profile.country)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Provider Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Provider</p>
            <Badge variant="secondary" className="text-sm">
              {account.providerId}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Provider Account ID</p>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {account.providerAccountId}
            </code>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Balance Update
            </p>
            <p className="font-medium">
              {account.lastBalanceUpdate 
                ? formatDateTime(account.lastBalanceUpdate) 
                : 'Never'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Status & History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status & History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Badge variant={account.status === 'ACTIVE' ? 'success' : 'warning'}>
              {account.status}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Created At</p>
            <p className="font-medium">{formatDateTime(account.createdAt)}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
            <p className="font-medium">{formatDateTime(account.updatedAt)}</p>
          </div>

          {account.suspendedAt && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">Suspended At</p>
              <p className="font-medium text-destructive">{formatDateTime(account.suspendedAt)}</p>
              {account.suspendReason && (
                <p className="text-sm text-muted-foreground mt-2">
                  Reason: {account.suspendReason}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}





