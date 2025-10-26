/**
 * User Wallets Management Page
 * Manage user cryptocurrency wallets
 */

'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, MoreHorizontal, ArrowUpDown, Wallet, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Combobox, ComboboxOption } from '@/components/shared/Combobox';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

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

interface User {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
  } | null;
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
  const [wallets, setWallets] = React.useState<UserWallet[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [blockchains, setBlockchains] = React.useState<BlockchainNetwork[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingWallet, setEditingWallet] = React.useState<UserWallet | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [walletToDelete, setWalletToDelete] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    userId: '',
    blockchainCode: '',
    currencyCode: '',
    address: '',
    label: '',
    isVerified: false,
    isDefault: false
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [walletsRes, usersRes, currenciesRes, blockchainsRes] = await Promise.all([
        fetch('/api/admin/user-wallets'),
        fetch('/api/admin/users'),
        fetch('/api/admin/resources/currencies?active=true'), // Only active
        fetch('/api/admin/blockchains?active=true') // Only active
      ]);

      const [walletsData, usersData, currenciesData, blockchainsData] = await Promise.all([
        walletsRes.json(),
        usersRes.json(),
        currenciesRes.json(),
        blockchainsRes.json()
      ]);

      if (walletsData.success) setWallets(walletsData.data);
      if (usersData.success) setUsers(usersData.data);
      if (currenciesData.success) setCurrencies(currenciesData.data);
      if (blockchainsData.success) setBlockchains(blockchainsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Combobox options
  const userOptions: ComboboxOption[] = React.useMemo(() => 
    users.map(u => ({
      value: u.id,
      label: `${u.email} ${u.profile?.firstName ? `(${u.profile.firstName} ${u.profile.lastName})` : ''}`
    })),
    [users]
  );

  const currencyOptions: ComboboxOption[] = React.useMemo(() =>
    currencies.map(c => ({
      value: c.code,
      label: `${c.symbol} ${c.code} - ${c.name}`
    })),
    [currencies]
  );

  const blockchainOptions: ComboboxOption[] = React.useMemo(() =>
    blockchains.map(b => ({
      value: b.code,
      label: `${b.code} - ${b.name}`
    })),
    [blockchains]
  );

  const handleAdd = () => {
    setEditingWallet(null);
    setFormData({
      userId: '',
      blockchainCode: '',
      currencyCode: '',
      address: '',
      label: '',
      isVerified: false,
      isDefault: false
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (wallet: UserWallet) => {
    setEditingWallet(wallet);
    setFormData({
      userId: wallet.userId,
      blockchainCode: wallet.blockchainCode,
      currencyCode: wallet.currencyCode,
      address: wallet.address,
      label: wallet.label || '',
      isVerified: wallet.isVerified,
      isDefault: wallet.isDefault
    });
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        label: formData.label || undefined
      };

      const url = editingWallet 
        ? `/api/admin/user-wallets/${editingWallet.id}`
        : '/api/admin/user-wallets';
      
      const res = await fetch(url, {
        method: editingWallet ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingWallet ? 'Wallet updated' : 'Wallet created');
        setIsSheetOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save wallet');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save wallet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setWalletToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!walletToDelete) return;

    try {
      const res = await fetch(`/api/admin/user-wallets/${walletToDelete}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Wallet deleted successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to delete wallet');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete wallet');
    } finally {
      setWalletToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const columns: ColumnDef<UserWallet>[] = [
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="space-y-1">
            <div className="font-medium">{user.email}</div>
            {user.profile && (
              <div className="text-sm text-muted-foreground">
                {user.profile.firstName} {user.profile.lastName}
              </div>
            )}
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
          <div className="flex items-center gap-2">
            <span className="text-lg">{currency.symbol}</span>
            <span className="font-medium">{currency.code}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'blockchain',
      header: 'Network',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.blockchain.code}</Badge>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Wallet Address',
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {row.original.address}
          </code>
          {row.original.label && (
            <div className="text-sm text-muted-foreground mt-1">
              {row.original.label}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.isVerified && (
            <Badge variant="default" className="flex items-center gap-1 w-fit">
              <CheckCircle className="h-3 w-3" />
              Verified
            </Badge>
          )}
          {row.original.isDefault && (
            <Badge variant="secondary">Default</Badge>
          )}
          {row.original._count && row.original._count.orders > 0 && (
            <div className="text-xs text-muted-foreground">
              {row.original._count.orders} orders
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
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
              <DropdownMenuItem onClick={() => handleEdit(wallet)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const explorerUrl = `${wallet.blockchain.explorerUrl}/address/${wallet.address}`;
                  window.open(explorerUrl, '_blank');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Explorer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(wallet.id)}
                className="text-destructive"
                disabled={(wallet._count?.orders || 0) > 0}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Wallets</h1>
          <p className="text-muted-foreground mt-1">
            Manage user cryptocurrency wallets and addresses
          </p>
        </div>
        <Button onClick={handleAdd} className="gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={wallets}
        isLoading={isLoading}
        searchKey="address"
        searchPlaceholder="Search by address..."
      />

      {/* Add/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingWallet ? 'Edit User Wallet' : 'Add User Wallet'}
            </SheetTitle>
            <SheetDescription>
              Configure user wallet details
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <Combobox
                options={userOptions}
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value })}
                placeholder="Select user..."
                searchPlaceholder="Search users..."
                disabled={!!editingWallet}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency *</Label>
                <Combobox
                  options={currencyOptions}
                  value={formData.currencyCode}
                  onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}
                  placeholder="Select currency..."
                  searchPlaceholder="Search..."
                  disabled={!!editingWallet}
                />
              </div>

              <div className="space-y-2">
                <Label>Blockchain *</Label>
                <Combobox
                  options={blockchainOptions}
                  value={formData.blockchainCode}
                  onValueChange={(value) => setFormData({ ...formData, blockchainCode: value })}
                  placeholder="Select network..."
                  searchPlaceholder="Search..."
                  disabled={!!editingWallet}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wallet Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="0x..."
                disabled={!!editingWallet}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Label (Optional)</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="My Main Wallet"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Verified</Label>
              <Switch
                checked={formData.isVerified}
                onCheckedChange={(checked) => setFormData({ ...formData, isVerified: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Set as Default</Label>
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Are you sure you want to delete this wallet?"
        description="This action cannot be undone. This will permanently delete the user's wallet address."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

