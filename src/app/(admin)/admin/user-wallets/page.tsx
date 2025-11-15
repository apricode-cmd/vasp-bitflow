/**
 * User Wallets Management Page - REDESIGNED
 * 
 * Enhanced wallet management with:
 * - Advanced data table with sorting & filtering
 * - Quick stats dashboard
 * - Bulk actions
 * - Export functionality
 * - Quick view details
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { WalletQuickStats } from './_components/WalletQuickStats';
import { WalletFilters } from './_components/WalletFilters';
import { WalletDetailsSheet } from './_components/WalletDetailsSheet';
import { formatDateTime } from '@/lib/formatters';
import { formatDateTimeForExport } from '@/lib/utils/export-utils';
import { toast } from 'sonner';
import { 
  MoreHorizontal, Eye, Trash2, CheckCircle, XCircle, 
  Star, ExternalLink, RefreshCw, Wallet, Download,
  ShieldCheck, Copy, User
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface BlockchainNetwork {
  code: string;
  name: string;
}

export default function UserWalletsPage(): JSX.Element {
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [blockchains, setBlockchains] = useState<BlockchainNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    currencyCode: '',
    blockchainCode: '',
    isVerified: '',
    isDefault: ''
  });

  useEffect(() => {
    fetchWallets();
    fetchStats();
    fetchResources();
  }, [filters]);

  const fetchWallets = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.currencyCode) params.append('currencyCode', filters.currencyCode);
      if (filters.blockchainCode) params.append('blockchainCode', filters.blockchainCode);
      if (filters.isVerified) params.append('isVerified', filters.isVerified);
      if (filters.isDefault) params.append('isDefault', filters.isDefault);

      const response = await fetch(`/api/admin/user-wallets?${params}`);
      const data = await response.json();

      if (data.success) {
        setWallets(data.data || []);
      } else {
        toast.error('Failed to fetch wallets');
      }
    } catch (error) {
      console.error('Fetch wallets error:', error);
      toast.error('Failed to fetch wallets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/user-wallets/stats');
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

  const fetchResources = async (): Promise<void> => {
    try {
      const [currenciesRes, blockchainsRes] = await Promise.all([
        fetch('/api/admin/resources/currencies?active=true'),
        fetch('/api/admin/blockchains?active=true')
      ]);

      const [currenciesData, blockchainsData] = await Promise.all([
        currenciesRes.json(),
        blockchainsRes.json()
      ]);

      if (currenciesData.success) setCurrencies(currenciesData.data);
      if (blockchainsData.success) setBlockchains(blockchainsData.data);
    } catch (error) {
      console.error('Fetch resources error:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      currencyCode: '',
      blockchainCode: '',
      isVerified: '',
      isDefault: ''
    });
  };

  const handleRefresh = async () => {
    await Promise.all([fetchWallets(), fetchStats()]);
    toast.success('Data refreshed');
  };

  const handleViewDetails = (wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setDetailsSheetOpen(true);
  };

  const handleVerify = async (walletId: string) => {
    try {
      const response = await fetch(`/api/admin/user-wallets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletIds: [walletId],
          action: 'verify'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Wallet verified');
        await handleRefresh();
        if (selectedWallet?.id === walletId) {
          setDetailsSheetOpen(false);
        }
      } else {
        toast.error(data.error || 'Failed to verify wallet');
      }
    } catch (error) {
      console.error('Verify wallet error:', error);
      toast.error('Failed to verify wallet');
    }
  };

  const handleSetDefault = async (walletId: string) => {
    try {
      const response = await fetch(`/api/admin/user-wallets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletIds: [walletId],
          action: 'setDefault'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Wallet set as default');
        await handleRefresh();
        if (selectedWallet?.id === walletId) {
          setDetailsSheetOpen(false);
        }
      } else {
        toast.error(data.error || 'Failed to set default');
      }
    } catch (error) {
      console.error('Set default error:', error);
      toast.error('Failed to set default');
    }
  };

  const handleDelete = async () => {
    if (!walletToDelete) return;

    try {
      const response = await fetch(`/api/admin/user-wallets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletIds: [walletToDelete],
          action: 'delete'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Wallet deleted');
        setDeleteDialogOpen(false);
        setWalletToDelete(null);
        await handleRefresh();
      } else {
        toast.error(data.error || 'Failed to delete wallet');
      }
    } catch (error) {
      console.error('Delete wallet error:', error);
      toast.error('Failed to delete wallet');
    }
  };

  const handleBulkVerify = async (ids: string[]) => {
    try {
      const response = await fetch(`/api/admin/user-wallets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletIds: ids,
          action: 'verify'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await handleRefresh();
      } else {
        toast.error(data.error || 'Bulk verify failed');
      }
    } catch (error) {
      console.error('Bulk verify error:', error);
      toast.error('Bulk verify failed');
    }
  };

  const handleBulkUnverify = async (ids: string[]) => {
    try {
      const response = await fetch(`/api/admin/user-wallets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletIds: ids,
          action: 'unverify'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await handleRefresh();
      } else {
        toast.error(data.error || 'Bulk unverify failed');
      }
    } catch (error) {
      console.error('Bulk unverify error:', error);
      toast.error('Bulk unverify failed');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const response = await fetch(`/api/admin/user-wallets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletIds: ids,
          action: 'delete'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await handleRefresh();
      } else {
        toast.error(data.error || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Bulk delete failed');
    }
  };

  const handleExport = (selectedIds?: string[]) => {
    const walletsToExport = selectedIds 
      ? wallets.filter(w => selectedIds.includes(w.id))
      : wallets;

    const csvData = walletsToExport.map(wallet => ({
      'Wallet ID': wallet.id,
      'User Email': wallet.user.email,
      'User Name': wallet.user.profile 
        ? `${wallet.user.profile.firstName} ${wallet.user.profile.lastName}`
        : 'N/A',
      'Currency': `${wallet.currency.symbol} ${wallet.currency.code}`,
      'Blockchain': `${wallet.blockchain.code} - ${wallet.blockchain.name}`,
      'Address': wallet.address,
      'Label': wallet.label || 'N/A',
      'Verified': wallet.isVerified ? 'Yes' : 'No',
      'Default': wallet.isDefault ? 'Yes' : 'No',
      'Orders Count': wallet._count?.orders || 0,
      'Created At': formatDateTimeForExport(wallet.createdAt),
      'Updated At': formatDateTimeForExport(wallet.updatedAt)
    }));

    // Simple CSV export without exportToCSV util
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...csvData.map(row => 
        headers.map(h => {
          const value = (row as any)[h];
          const stringValue = String(value ?? '');
          return stringValue.includes(',') || stringValue.includes('"') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(',')
      )
    ].join('\n');

    // Download
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallets-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${csvData.length} wallet(s)`);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Define columns
  const columns: ColumnDef<UserWallet>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original.user;
        const fullName = user.profile 
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : '';
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.profile?.firstName?.[0] || user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.email}</span>
              {fullName && (
                <span className="text-xs text-muted-foreground">{fullName}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => {
        const currency = row.original.currency;
        return (
          <Badge variant="outline">
            {currency.symbol} {currency.code}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'blockchain',
      header: 'Network',
      cell: ({ row }) => {
        const blockchain = row.original.blockchain;
        return (
          <span className="text-sm">
            {blockchain.code}
          </span>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const address = row.original.address;
        const short = `${address.slice(0, 8)}...${address.slice(-6)}`;
        return (
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono">{short}</code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(address, 'Address');
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'label',
      header: 'Label',
      cell: ({ row }) => {
        const label = row.original.label;
        return label ? (
          <span className="text-sm">{label}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'isVerified',
      header: 'Verified',
      cell: ({ row }) => {
        const isVerified = row.original.isVerified;
        return isVerified ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Unverified
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }) => {
        const isDefault = row.original.isDefault;
        return isDefault ? (
          <Star className="h-4 w-4 fill-current text-amber-500" />
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: '_count.orders',
      header: 'Orders',
      cell: ({ row }) => {
        const count = row.original._count?.orders || 0;
        return (
          <Badge variant="outline">
            {count}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const wallet = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewDetails(wallet)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/users/${wallet.userId}`}>
                  <User className="mr-2 h-4 w-4" />
                  View User
                </Link>
              </DropdownMenuItem>
              {wallet.blockchain.explorerUrl && (
                <DropdownMenuItem
                  onClick={() => {
                    window.open(
                      `${wallet.blockchain.explorerUrl}/address/${wallet.address}`,
                      '_blank'
                    );
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Explorer
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!wallet.isVerified && (
                <DropdownMenuItem onClick={() => handleVerify(wallet.id)}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify
                </DropdownMenuItem>
              )}
              {!wallet.isDefault && (
                <DropdownMenuItem onClick={() => handleSetDefault(wallet.id)}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setWalletToDelete(wallet.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            User Wallets
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage cryptocurrency wallet addresses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport()}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <WalletQuickStats stats={stats.stats} isLoading={statsLoading} />
      )}

      <Separator />

      {/* Data Table */}
      <DataTableAdvanced
        columns={columns}
        data={wallets}
        isLoading={loading}
        onRowClick={handleViewDetails}
        filters={
          <WalletFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            currencies={currencies}
            blockchains={blockchains}
          />
        }
        bulkActions={[
          {
            label: 'Verify',
            onClick: handleBulkVerify,
            icon: <ShieldCheck className="h-4 w-4" />,
          },
          {
            label: 'Unverify',
            onClick: handleBulkUnverify,
            icon: <XCircle className="h-4 w-4" />,
          },
          {
            label: 'Delete',
            onClick: handleBulkDelete,
            icon: <Trash2 className="h-4 w-4" />,
            variant: 'destructive',
          },
        ]}
        onExport={handleExport}
      />

      {/* Wallet Details Sheet */}
      <WalletDetailsSheet
        wallet={selectedWallet}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        onVerify={handleVerify}
        onSetDefault={handleSetDefault}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wallet? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
