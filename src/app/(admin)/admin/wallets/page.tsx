/**
 * Platform Wallets Management Page
 * 
 * Modern wallet management with CRUD operations and balance tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { DataTable } from '@/components/admin/DataTable';
import { Combobox, type ComboboxOption } from '@/components/shared/Combobox';
import { RelatedEntityBadge } from '@/components/crm/RelatedEntityBadge';
import { toast } from 'sonner';
import { 
  Wallet, Plus, Edit, Trash2, Copy, RefreshCw, 
  ExternalLink, CheckCircle, AlertTriangle, MoreHorizontal, ShoppingCart
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

interface PlatformWallet {
  id: string;
  currencyCode: string;
  address: string;
  label: string;
  isActive: boolean;
  isDefault: boolean;
  balance?: number;
  lastUsed?: Date | null;
  _count?: { orders: number };
}

export default function PlatformWalletsPage(): JSX.Element {
  const [wallets, setWallets] = useState<PlatformWallet[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<PlatformWallet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<PlatformWallet | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const [walletsRes, currRes] = await Promise.all([
        fetch('/api/admin/wallets'),
        fetch('/api/admin/resources/currencies?active=true') // Only active
      ]);

      const [walletsData, currData] = await Promise.all([
        walletsRes.json(),
        currRes.json()
      ]);

      if (walletsData.success) {
        setWallets(walletsData.data.map((w: any) => ({
          ...w,
          lastUsed: w.lastUsed ? new Date(w.lastUsed) : null
        })));
      }
      if (currData.success) {
        setCurrencies(currData.data); // Already filtered by active=true
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = () => {
    setSelectedWallet(null);
    setFormData({ isActive: true, isDefault: false });
    setSheetOpen(true);
  };

  const handleEdit = (wallet: PlatformWallet) => {
    setSelectedWallet(wallet);
    setFormData({
      currencyCode: wallet.currencyCode,
      address: wallet.address,
      label: wallet.label,
      isActive: wallet.isActive,
      isDefault: wallet.isDefault
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    try {
      const endpoint = selectedWallet 
        ? `/api/admin/wallets/${selectedWallet.id}`
        : '/api/admin/wallets';
      
      const method = selectedWallet ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Wallet ${selectedWallet ? 'updated' : 'created'} successfully`);
        await fetchAll();
        setSheetOpen(false);
      } else {
        toast.error(result.error || 'Failed to save wallet');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    }
  };

  const openDeleteDialog = (wallet: PlatformWallet) => {
    setWalletToDelete(wallet);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!walletToDelete) return;

    try {
      const response = await fetch(`/api/admin/wallets/${walletToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Wallet deleted successfully');
        await fetchAll();
      } else {
        toast.error(result.error || 'Failed to delete wallet');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred');
    } finally {
      setDeleteDialogOpen(false);
      setWalletToDelete(null);
    }
  };

  const copyAddress = (address: string): void => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const setAsDefault = async (walletId: string) => {
    try {
      const response = await fetch(`/api/admin/wallets/${walletId}/set-default`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Default wallet updated');
        await fetchAll();
      }
    } catch (error) {
      toast.error('Failed to set as default');
    }
  };

  // Prepare currency options
  const currencyOptions: ComboboxOption[] = currencies.map(c => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
    description: c.symbol
  }));

  // Define table columns
  const columns: ColumnDef<PlatformWallet>[] = [
    {
      accessorKey: 'label',
      header: 'Wallet',
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                {wallet.label}
                {wallet.isDefault && (
                  <Badge variant="default" className="text-xs">Default</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{wallet.currencyCode}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 max-w-xs">
          <code className="text-xs font-mono truncate">
            {row.original.address}
          </code>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              copyAddress(row.original.address);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div>
            {wallet.balance !== undefined ? (
              <span className="font-medium">
                {wallet.balance} {wallet.currencyCode}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={wallet.isActive ? 'success' : 'secondary'}>
              {wallet.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {wallet._count && wallet._count.orders > 0 && (
              <RelatedEntityBadge
                entity="orders"
                count={wallet._count.orders}
                href={`/admin/orders?walletId=${wallet.id}`}
                icon={ShoppingCart}
                variant="outline"
              />
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const wallet = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Wallet Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEdit(wallet)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Wallet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyAddress(wallet.address)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!wallet.isDefault && (
                  <DropdownMenuItem onClick={() => setAsDefault(wallet.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => window.open(`https://blockchain.com/explorer`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => openDeleteDialog(wallet)}
                  className="text-destructive focus:text-destructive"
                  disabled={wallet._count?.orders && wallet._count.orders > 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Wallet
                  {wallet._count?.orders && wallet._count.orders > 0 && (
                    <span className="ml-auto text-xs">(In use)</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Wallets</h1>
          <p className="text-muted-foreground mt-1">
            Manage cryptocurrency wallets for receiving and storing crypto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchAll}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleCreate} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
      </div>

      {/* Wallets Table */}
      <DataTable
        columns={columns}
        data={wallets}
        isLoading={loading}
        pageSize={15}
      />

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedWallet ? 'Edit' : 'Add'} Platform Wallet
            </SheetTitle>
            <SheetDescription>
              Configure wallet for receiving cryptocurrency payments
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Currency Selection */}
            <div>
              <Label>Cryptocurrency</Label>
              <Combobox
                options={currencyOptions}
                value={formData.currencyCode || ''}
                onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}
                placeholder="Select cryptocurrency..."
                searchPlaceholder="Search currency..."
                disabled={!!selectedWallet}
              />
              {selectedWallet && (
                <p className="text-xs text-muted-foreground mt-1">
                  Currency cannot be changed after creation
                </p>
              )}
            </div>

            <Separator />

            {/* Wallet Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="label">Wallet Label</Label>
                <Input
                  id="label"
                  value={formData.label || ''}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Main BTC Wallet"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Friendly name for identifying this wallet
                </p>
              </div>

              <div>
                <Label htmlFor="address">Wallet Address</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter wallet address..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cryptocurrency will be sent from this address
                </p>
              </div>
            </div>

            <Separator />

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this wallet for transactions
                  </p>
                </div>
                <Switch
                  checked={formData.isActive !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Set as Default</Label>
                  <p className="text-sm text-muted-foreground">
                    Use as primary wallet for this currency
                  </p>
                </div>
                <Switch
                  checked={formData.isDefault || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
              </div>
            </div>

            {/* Warnings */}
            {selectedWallet && selectedWallet._count && selectedWallet._count.orders > 0 && (
              <>
                <Separator />
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-500/50 rounded-lg">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Wallet In Use
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        This wallet is used in {selectedWallet._count.orders} orders. 
                        Deactivating it will prevent new orders from using it.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button onClick={handleSave} className="w-full gradient-primary">
                {selectedWallet ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Wallet
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Wallet
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              {walletToDelete?.balance && walletToDelete.balance > 0 ? (
                <div className="space-y-2">
                  <p className="text-destructive font-semibold">
                    WARNING: This wallet has a balance of {walletToDelete.balance} {walletToDelete.currencyCode}
                  </p>
                  <p>
                    Please transfer all funds before deleting. Deleting a wallet with balance may result in loss of funds.
                  </p>
                </div>
              ) : (
                <p>
                  This action cannot be undone. This will permanently delete the wallet configuration.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={walletToDelete?.balance && walletToDelete.balance > 0}
            >
              {walletToDelete?.balance && walletToDelete.balance > 0 ? 'Cannot Delete' : 'Delete Wallet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
