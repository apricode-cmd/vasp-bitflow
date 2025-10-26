/**
 * Currencies Management Page
 * 
 * Unified management for Cryptocurrencies and Fiat Currencies
 * Cryptocurrencies can be linked to multiple blockchain networks (e.g., USDC on Ethereum, Polygon, Solana)
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Coins, TrendingUp, Plus, Edit, Trash2, RefreshCw, MoreHorizontal, Network, CheckCircle, XCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceManager } from '@/components/crm/ResourceManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Cryptocurrency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  precision: number;
  coingeckoId: string;
  isToken: boolean;
  iconUrl: string | null;
  minOrderAmount: number;
  maxOrderAmount: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  blockchainNetworks?: CurrencyBlockchainNetwork[];
}

interface CurrencyBlockchainNetwork {
  id: string;
  currencyCode: string;
  blockchainCode: string;
  contractAddress: string | null;
  isNative: boolean;
  isActive: boolean;
  priority: number;
  blockchain: {
    code: string;
    name: string;
    symbol?: string;
  };
}

interface BlockchainNetwork {
  code: string;
  name: string;
  symbol?: string;
  isActive: boolean;
}

interface BlockchainSelection {
  blockchainCode: string;
  contractAddress: string;
  isNative: boolean;
  isActive: boolean;
  priority: number;
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
    iconUrl: null,
    minOrderAmount: 0.001,
    maxOrderAmount: 100,
    isActive: true,
    priority: 0,
  });

  // Blockchain selection state
  const [selectedBlockchains, setSelectedBlockchains] = useState<BlockchainSelection[]>([]);

  useEffect(() => {
    fetchData();
    fetchBlockchainNetworks();
  }, []);

  const fetchData = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/resources/currencies?includeBlockchains=true');
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
      iconUrl: null,
      minOrderAmount: 0.001,
      maxOrderAmount: 100,
      isActive: true,
      priority: 0,
    });
    setSelectedBlockchains([]);
    setShowSheet(true);
  };

  const handleEdit = (item: Cryptocurrency): void => {
    setEditingItem(item);
    setFormData(item);
    
    // Pre-populate blockchain selections
    if (item.blockchainNetworks) {
      setSelectedBlockchains(
        item.blockchainNetworks.map(bn => ({
          blockchainCode: bn.blockchainCode,
          contractAddress: bn.contractAddress || '',
          isNative: bn.isNative,
          isActive: bn.isActive,
          priority: bn.priority
        }))
      );
    } else {
      setSelectedBlockchains([]);
    }
    
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

    // Validation: must have at least one blockchain
    if (selectedBlockchains.length === 0) {
      toast.error('Please select at least one blockchain network');
      return;
    }

    try {
      const url = editingItem
        ? `/api/admin/resources/currencies/${editingItem.code}`
        : '/api/admin/resources/currencies';
      
      const method = editingItem ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        blockchains: selectedBlockchains
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const toggleBlockchain = (blockchainCode: string): void => {
    const index = selectedBlockchains.findIndex(b => b.blockchainCode === blockchainCode);
    
    if (index >= 0) {
      // Remove blockchain
      setSelectedBlockchains(selectedBlockchains.filter((_, i) => i !== index));
    } else {
      // Add blockchain
      setSelectedBlockchains([
        ...selectedBlockchains,
        {
          blockchainCode,
          contractAddress: '',
          isNative: false,
          isActive: true,
          priority: selectedBlockchains.length
        }
      ]);
    }
  };

  const updateBlockchainDetail = (blockchainCode: string, field: keyof BlockchainSelection, value: any): void => {
    setSelectedBlockchains(
      selectedBlockchains.map(b => 
        b.blockchainCode === blockchainCode 
          ? { ...b, [field]: value }
          : b
      )
    );
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
      accessorKey: 'blockchainNetworks',
      header: 'Blockchain Networks',
      cell: ({ row }) => {
        const networks = row.original.blockchainNetworks || [];
        
        if (networks.length === 0) {
          return <span className="text-xs text-muted-foreground">None</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {networks.slice(0, 3).map(network => (
              <Badge key={network.id} variant="secondary" className="text-xs gap-1">
                <Network className="h-3 w-3" />
                {network.blockchain.name}
                {network.isNative && ' (Native)'}
              </Badge>
            ))}
            {networks.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{networks.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'isToken',
      header: 'Type',
      cell: ({ row }) => {
        const isToken = row.original.isToken;
        const networks = row.original.blockchainNetworks || [];
        const hasNative = networks.some(n => n.isNative);
        
        if (hasNative && !isToken) {
          return (
            <Badge variant="default" className="gap-1">
              <Coins className="h-3 w-3" />
              Native Coin
            </Badge>
          );
        }
        
        return (
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-3 w-3" />
            Token
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
                    Manage crypto assets with multi-blockchain support (e.g., USDC on Ethereum, Polygon, Solana)
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
              { key: 'precision', label: 'Decimals', type: 'number' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
            fields={[
              { name: 'code', label: 'Currency Code', type: 'text', required: true, placeholder: 'EUR' },
              { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Euro' },
              { name: 'symbol', label: 'Symbol', type: 'text', required: true, placeholder: '€' },
              { name: 'precision', label: 'Decimals', type: 'number', required: true, placeholder: '2' },
              { name: 'isActive', label: 'Active', type: 'boolean' },
              { name: 'priority', label: 'Display Priority', type: 'number', placeholder: '0' }
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="sm:max-w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem ? 'Edit' : 'Create'} Cryptocurrency</SheetTitle>
            <SheetDescription>
              {editingItem ? 'Update' : 'Add a new'} cryptocurrency. You can link it to multiple blockchain networks.
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
                    placeholder="USDC"
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
                    placeholder="$"
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
                  placeholder="USD Coin"
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
                    placeholder="6"
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
                    placeholder="6"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Blockchain Networks Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Blockchain Networks *
                </h3>
                <Badge variant="secondary">
                  {selectedBlockchains.length} selected
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which blockchain networks support this cryptocurrency (e.g., USDC on Ethereum, Polygon, Solana)
              </p>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  {blockchainNetworks.map(network => {
                    const isSelected = selectedBlockchains.some(b => b.blockchainCode === network.code);
                    const selection = selectedBlockchains.find(b => b.blockchainCode === network.code);
                    
                    return (
                      <div key={network.code} className="space-y-3 pb-4 border-b last:border-0">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`blockchain-${network.code}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleBlockchain(network.code)}
                          />
                          <Label
                            htmlFor={`blockchain-${network.code}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            <Network className="h-4 w-4" />
                            {network.name} ({network.code})
                          </Label>
                        </div>
                        
                        {isSelected && selection && (
                          <div className="ml-7 space-y-3 pl-4 border-l-2">
                            <div className="space-y-2">
                              <Label className="text-xs">Contract Address (for tokens)</Label>
                              <Input
                                value={selection.contractAddress}
                                onChange={(e) => updateBlockchainDetail(network.code, 'contractAddress', e.target.value)}
                                placeholder="0x... (leave empty for native coins)"
                                className="text-xs font-mono"
                              />
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`native-${network.code}`}
                                  checked={selection.isNative}
                                  onCheckedChange={(checked) => updateBlockchainDetail(network.code, 'isNative', checked)}
                                />
                                <Label htmlFor={`native-${network.code}`} className="text-xs cursor-pointer">
                                  Native Coin
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`active-${network.code}`}
                                  checked={selection.isActive}
                                  onCheckedChange={(checked) => updateBlockchainDetail(network.code, 'isActive', checked)}
                                />
                                <Label htmlFor={`active-${network.code}`} className="text-xs cursor-pointer">
                                  Active
                                </Label>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs">Priority (display order)</Label>
                              <Input
                                type="number"
                                value={selection.priority}
                                onChange={(e) => updateBlockchainDetail(network.code, 'priority', parseInt(e.target.value))}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* CoinGecko Integration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">CoinGecko Integration</h3>
              
              <div className="space-y-2">
                <Label htmlFor="coingeckoId">CoinGecko ID *</Label>
                <Input
                  id="coingeckoId"
                  value={formData.coingeckoId}
                  onChange={(e) => setFormData({ ...formData, coingeckoId: e.target.value })}
                  placeholder="usd-coin"
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
                  <Label>Is Token?</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable if this is a token (not a native coin like BTC/ETH)
                  </p>
                </div>
                <Switch
                  checked={formData.isToken}
                  onCheckedChange={(checked) => setFormData({ ...formData, isToken: checked })}
                />
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
