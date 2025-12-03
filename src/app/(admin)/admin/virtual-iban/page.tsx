/**
 * Virtual IBAN Management Page - Admin
 * 
 * Список всех Virtual IBAN счетов с:
 * - Quick Stats (общая статистика)
 * - Advanced data table (сортировка, фильтрация, экспорт)
 * - Bulk actions
 * - Filters (status, provider, currency)
 * 
 * Переиспользует компоненты из users для консистентности
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { QuickStats, QuickStat } from '@/components/admin/QuickStats';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { toast } from 'sonner';
import { 
  MoreHorizontal, Eye, Ban, CheckCircle, RefreshCw, 
  Building2, Users, TrendingUp, Clock, Download,
  Landmark, Copy
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VirtualIbanAccount {
  id: string;
  userId: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      country: string;
    } | null;
  };
  providerId: string;
  providerAccountId: string;
  iban: string;
  bic: string | null;
  bankName: string;
  accountHolder: string;
  currency: string;
  country: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING' | 'FAILED';
  balance: number;
  lastBalanceUpdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    transactions: number;
  };
}

interface Stats {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  totalTransactions: number;
  unreconciledTransactions: number;
  totalVolume: number;
}

export default function VirtualIbanPage(): JSX.Element {
  const [accounts, setAccounts] = useState<VirtualIbanAccount[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  useEffect(() => {
    fetchAccounts();
    fetchStats();
  }, [statusFilter, providerFilter, currencyFilter]);

  const fetchAccounts = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (providerFilter !== 'all') {
        params.append('providerId', providerFilter);
      }
      if (currencyFilter !== 'all') {
        params.append('currency', currencyFilter);
      }

      const response = await fetch(`/api/admin/virtual-iban?${params}`);
      const data = await response.json();

      if (data.success) {
        setAccounts(data.data.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
          lastBalanceUpdate: a.lastBalanceUpdate ? new Date(a.lastBalanceUpdate) : null,
        })));
      } else {
        toast.error('Failed to fetch accounts');
      }
    } catch (error) {
      console.error('Fetch accounts error:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/virtual-iban/statistics');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSyncAccount = async (accountId: string): Promise<void> => {
    const toastId = toast.loading('Syncing account...');
    try {
      const response = await fetch(`/api/admin/virtual-iban/${accountId}/sync`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Account synced successfully', { id: toastId });
        fetchAccounts();
      } else {
        toast.error('Failed to sync account', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to sync account', { id: toastId });
    }
  };

  const handleSuspendAccount = async (accountId: string): Promise<void> => {
    const toastId = toast.loading('Suspending account...');
    try {
      const response = await fetch(`/api/admin/virtual-iban/${accountId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Suspended by admin' }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Account suspended', { id: toastId });
        fetchAccounts();
      } else {
        toast.error('Failed to suspend account', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to suspend account', { id: toastId });
    }
  };

  const handleReactivateAccount = async (accountId: string): Promise<void> => {
    const toastId = toast.loading('Reactivating account...');
    try {
      const response = await fetch(`/api/admin/virtual-iban/${accountId}/reactivate`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Account reactivated', { id: toastId });
        fetchAccounts();
      } else {
        toast.error('Failed to reactivate account', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to reactivate account', { id: toastId });
    }
  };

  const copyIban = (iban: string): void => {
    navigator.clipboard.writeText(iban);
    toast.success('IBAN copied to clipboard');
  };

  // Table columns
  const columns: ColumnDef<VirtualIbanAccount>[] = [
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original.user;
        const initials = `${user.profile?.firstName?.charAt(0) || ''}${user.profile?.lastName?.charAt(0) || 'U'}`;
        const fullName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Unknown';
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'iban',
      header: 'IBAN',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {row.original.iban}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => copyIban(row.original.iban)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'bankName',
      header: 'Bank',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.bankName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.currency} • {getCountryFlag(row.original.country)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.balance, row.original.currency)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, any> = {
          ACTIVE: { variant: 'success', label: 'Active' },
          SUSPENDED: { variant: 'warning', label: 'Suspended' },
          CLOSED: { variant: 'destructive', label: 'Closed' },
          PENDING: { variant: 'secondary', label: 'Pending' },
          FAILED: { variant: 'destructive', label: 'Failed' },
        };
        const config = variants[status] || { variant: 'default', label: status };
        
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const account = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/virtual-iban/${account.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSyncAccount(account.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Account
              </DropdownMenuItem>
              {account.status === 'ACTIVE' && (
                <DropdownMenuItem onClick={() => handleSuspendAccount(account.id)}>
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              )}
              {account.status === 'SUSPENDED' && (
                <DropdownMenuItem onClick={() => handleReactivateAccount(account.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Quick stats
  const quickStats: QuickStat[] = [
    {
      label: 'Total Accounts',
      value: stats?.totalAccounts || 0,
      icon: <Landmark className="h-4 w-4" />,
      color: 'blue',
    },
    {
      label: 'Active Accounts',
      value: stats?.activeAccounts || 0,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'green',
    },
    {
      label: 'Total Volume',
      value: formatCurrency(stats?.totalVolume || 0, 'EUR'),
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'success',
    },
    {
      label: 'Unreconciled',
      value: stats?.unreconciledTransactions || 0,
      description: 'Need manual review',
      icon: <Clock className="h-4 w-4" />,
      color: stats && stats.unreconciledTransactions > 0 ? 'warning' : 'default',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Landmark className="w-8 h-8" />
            Virtual IBAN Management
          </h1>
          <p className="text-muted-foreground">
            Manage Virtual IBAN accounts and transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fetchAccounts()} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/virtual-iban/unreconciled">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Unreconciled ({stats?.unreconciledTransactions || 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats stats={quickStats} isLoading={statsLoading} />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="BCB_GROUP">BCB Group</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="PLN">PLN</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTableAdvanced
        columns={columns}
        data={accounts}
        searchKey="iban"
        searchPlaceholder="Search by IBAN..."
        isLoading={loading}
        onRowClick={(row) => window.location.href = `/admin/virtual-iban/${row.id}`}
        enableExport
        exportFilename="virtual-iban-accounts"
      />
    </div>
  );
}

