/**
 * Currencies Management Page
 * 
 * Unified management for Cryptocurrencies and Fiat Currencies
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/admin/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Coins, TrendingUp, Plus, Edit, Trash2, RefreshCw, MoreHorizontal, Network, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Combobox } from '@/components/shared/Combobox';
import { ResourceManager } from '@/components/crm/ResourceManager';

interface Cryptocurrency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  precision: number;
  coingeckoId: string;
  isToken: boolean;
  chain: string | null;
  contractAddress: string | null;
  iconUrl: string | null;
  minOrderAmount: number;
  maxOrderAmount: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BlockchainNetwork {
  code: string;
  name: string;
  symbol?: string;
  isActive: boolean;
}

export default function CurrenciesPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState('crypto');
  
  // Cryptocurrencies state
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>([]);
  const [blockchainNetworks, setBlockchainNetworks] = useState<BlockchainNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<Cryptocurrency | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Cryptocurrency | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Cryptocurrency>>({
    code: '',
    name: '',
    symbol: '',
    decimals: 8,
    precision: 8,
    coingeckoId: '',
    isToken: false,
    chain: null,
    contractAddress: null,
    iconUrl: null,
    minOrderAmount: 0.001,
    maxOrderAmount: 100,
    isActive: true,
    priority: 0,
  });

  useEffect(() => {
    fetchData();
    fetchBlockchainNetworks();
  }, []);

  const fetchData = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/resources/currencies');
      const result = await response.json();

      if (result.success) {
        setCryptocurrencies(result.data);
      } else {
        toast.error('Failed to fetch cryptocurrencies');
      }
    } catch (error) {
      console.error('Fetch cryptocurrencies error:', error);
      toast.error('Failed to fetch cryptocurrencies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBlockchainNetworks = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/blockchains?active=true');
      const result = await response.json();

      if (result.success) {
        setBlockchainNetworks(result.data);
      }
    } catch (error) {
      console.error('Fetch blockchain networks error:', error);
    }
  };

  const handleCreate = (): void => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      symbol: '',
      decimals: 8,
      precision: 8,
      coingeckoId: '',
      isToken: false,
      chain: null,
      contractAddress: null,
      iconUrl: null,
      minOrderAmount: 0.001,
      maxOrderAmount: 100,
      isActive: true,
      priority: 0,
    });
    setShowSheet(true);
  };

  const handleEdit = (item: Cryptocurrency): void => {
    setEditingItem(item);
    setFormData(item);
    setShowSheet(true);
  };

  const handleDelete = (item: Cryptocurrency): void => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/admin/resources/currencies/${itemToDelete.code}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cryptocurrency deleted successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete cryptocurrency');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete cryptocurrency');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    try {
      const url = editingItem
        ? `/api/admin/resources/currencies/${editingItem.code}`
        : '/api/admin/resources/currencies';
      
      const method = editingItem ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Cryptocurrency ${editingItem ? 'updated' : 'created'} successfully`);
        setShowSheet(false);
        fetchData();
      } else {
        toast.error(result.error || `Failed to ${editingItem ? 'update' : 'create'} cryptocurrency`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} cryptocurrency`);
    }
  };

  const columns: ColumnDef<Cryptocurrency>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <Badge variant="default" className="font-mono">
          {row.original.code}
        </Badge>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'symbol',
      header: 'Symbol',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.symbol}</span>
      ),
    },
    {
      accessorKey: 'isToken',
      header: 'Type',
      cell: ({ row }) => {
        const isToken = row.original.isToken;
        const chain = row.original.chain;
        
        if (isToken && chain) {
          const network = blockchainNetworks.find(n => n.code === chain);
          return (
            <Badge variant="secondary" className="gap-1">
              <Network className="h-3 w-3" />
              Token on {network?.name || chain}
            </Badge>
          );
        }
        
        return (
          <Badge variant="default" className="gap-1">
            <Coins className="h-3 w-3" />
            Native Coin
          </Badge>
        );
      },
    },
    {
      accessorKey: 'decimals',
      header: 'Decimals',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.decimals}</span>
      ),
    },
    {
      accessorKey: 'coingeckoId',
      header: 'CoinGecko ID',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.coingeckoId}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        row.original.isActive ? (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
            <XCircle className="h-3 w-3" />
            Inactive
          </Badge>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.original)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Currencies Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage cryptocurrencies and fiat currencies
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="crypto" className="gap-2">
            <Coins className="h-4 w-4" />
            Cryptocurrencies
          </TabsTrigger>
          <TabsTrigger value="fiat" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Fiat Currencies
          </TabsTrigger>
        </TabsList>

        {/* Cryptocurrencies Tab */}
        <TabsContent value="crypto" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cryptocurrencies</CardTitle>
                  <CardDescription>
                    Manage crypto assets including native coins and tokens
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button onClick={handleCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cryptocurrency
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <DataTable columns={columns} data={cryptocurrencies} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiat Currencies Tab */}
        <TabsContent value="fiat" className="mt-6">
          <ResourceManager
            resource="fiat currencies"
            title="Fiat Currencies"
            description="Manage fiat currencies for payments"
            apiEndpoint="/api/admin/resources/fiat-currencies"
            primaryKey="code"
            columns={[
              { key: 'code', label: 'Code', type: 'badge' },
              { key: 'name', label: 'Name' },
              { key: 'symbol', label: 'Symbol' },
              { key: 'decimals', label: 'Decimals', type: 'number' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
            fields={[
              { name: 'code', label: 'Currency Code', type: 'text', required: true, placeholder: 'EUR' },
              { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Euro' },
              { name: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: '€' },
              { name: 'decimals', label: 'Decimals', type: 'number', required: true, placeholder: '2' },
              { name: 'isActive', label: 'Active', type: 'boolean' },
              { name: 'priority', label: 'Display Priority', type: 'number', placeholder: '0' }
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem ? 'Edit' : 'Create'} Cryptocurrency</SheetTitle>
            <SheetDescription>
              {editingItem ? 'Update' : 'Add a new'} cryptocurrency to the system
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Currency Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="BTC"
                    required
                    disabled={!!editingItem}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="₿"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bitcoin"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="decimals">Decimals *</Label>
                  <Input
                    id="decimals"
                    type="number"
                    value={formData.decimals}
                    onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                    placeholder="8"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precision">Display Precision *</Label>
                  <Input
                    id="precision"
                    type="number"
                    value={formData.precision}
                    onChange={(e) => setFormData({ ...formData, precision: parseInt(e.target.value) })}
                    placeholder="8"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Blockchain Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Network className="h-4 w-4" />
                Blockchain Network
              </h3>

              <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Is Token?</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable if this is a token (ERC20, BEP20, etc.)
                  </p>
                </div>
                <Switch
                  checked={formData.isToken}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      isToken: checked,
                      chain: checked ? formData.chain : null,
                      contractAddress: checked ? formData.contractAddress : null
                    })
                  }
                />
              </div>

              {formData.isToken && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="chain">Blockchain Network *</Label>
                    <Combobox
                      options={blockchainNetworks.map(network => ({
                        value: network.code,
                        label: `${network.name} (${network.code})`,
                        description: network.symbol || network.code
                      }))}
                      value={formData.chain || ''}
                      onValueChange={(value) => setFormData({ ...formData, chain: value })}
                      placeholder="Select blockchain network..."
                      searchPlaceholder="Search network..."
                      emptyText="No blockchain networks found"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractAddress">Contract Address</Label>
                    <Input
                      id="contractAddress"
                      value={formData.contractAddress || ''}
                      onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                      placeholder="0x..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* CoinGecko Integration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">CoinGecko Integration</h3>
              
              <div className="space-y-2">
                <Label htmlFor="coingeckoId">CoinGecko ID *</Label>
                <Input
                  id="coingeckoId"
                  value={formData.coingeckoId}
                  onChange={(e) => setFormData({ ...formData, coingeckoId: e.target.value })}
                  placeholder="bitcoin"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Used to fetch real-time prices from CoinGecko API
                </p>
              </div>
            </div>

            {/* Order Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Order Limits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minOrderAmount">Min Order Amount</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    step="0.00000001"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) })}
                    placeholder="0.001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxOrderAmount">Max Order Amount</Label>
                  <Input
                    id="maxOrderAmount"
                    type="number"
                    step="0.00000001"
                    value={formData.maxOrderAmount}
                    onChange={(e) => setFormData({ ...formData, maxOrderAmount: parseFloat(e.target.value) })}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Additional Settings</h3>
              
              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL (optional)</Label>
                <Input
                  id="iconUrl"
                  value={formData.iconUrl || ''}
                  onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Display Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority = displayed first
                </p>
              </div>

              <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to allow trading with this cryptocurrency
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSheet(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'} Cryptocurrency
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the cryptocurrency <strong>{itemToDelete?.name}</strong> ({itemToDelete?.code}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
