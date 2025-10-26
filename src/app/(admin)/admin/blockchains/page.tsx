/**
 * Blockchain Networks Management Page
 * Manage blockchain networks (ETH, BSC, POLYGON, BITCOIN, etc.)
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
import { Plus, MoreHorizontal, ArrowUpDown, Network, ExternalLink, Users, Wallet, ShoppingBag, Edit, Power, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

interface BlockchainNetwork {
  id: string;
  code: string;
  name: string;
  nativeToken: string;
  explorerUrl: string;
  rpcUrl?: string | null;
  chainId?: number | null;
  minConfirmations: number;
  isActive: boolean;
  priority: number;
  _count?: {
    userWallets: number;
    platformWallets: number;
    orders: number;
  };
}

export default function BlockchainsPage(): JSX.Element {
  const [blockchains, setBlockchains] = React.useState<BlockchainNetwork[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingBlockchain, setEditingBlockchain] = React.useState<BlockchainNetwork | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [blockchainToDelete, setBlockchainToDelete] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    code: '',
    name: '',
    nativeToken: '',
    explorerUrl: '',
    rpcUrl: '',
    chainId: '',
    minConfirmations: '12',
    isActive: true,
    priority: '0'
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/blockchains');
      const data = await res.json();

      if (data.success) {
        setBlockchains(data.data);
      } else {
        toast.error('Failed to load blockchain networks');
      }
    } catch (error) {
      console.error('Failed to fetch blockchains:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBlockchain(null);
    setFormData({
      code: '',
      name: '',
      nativeToken: '',
      explorerUrl: '',
      rpcUrl: '',
      chainId: '',
      minConfirmations: '12',
      isActive: true,
      priority: '0'
    });
    setIsSheetOpen(true);
  };

  const handleQuickAddTron = () => {
    setEditingBlockchain(null);
    setFormData({
      code: 'TRON',
      name: 'Tron',
      nativeToken: 'TRX',
      explorerUrl: 'https://tronscan.org',
      rpcUrl: 'https://api.trongrid.io',
      chainId: '',
      minConfirmations: '19',
      isActive: true,
      priority: '4'
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (blockchain: BlockchainNetwork) => {
    setEditingBlockchain(blockchain);
    setFormData({
      code: blockchain.code,
      name: blockchain.name,
      nativeToken: blockchain.nativeToken,
      explorerUrl: blockchain.explorerUrl,
      rpcUrl: blockchain.rpcUrl || '',
      chainId: blockchain.chainId?.toString() || '',
      minConfirmations: blockchain.minConfirmations.toString(),
      isActive: blockchain.isActive,
      priority: blockchain.priority.toString()
    });
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        nativeToken: formData.nativeToken.toUpperCase(),
        explorerUrl: formData.explorerUrl,
        rpcUrl: formData.rpcUrl || null,
        chainId: formData.chainId ? parseInt(formData.chainId) : null,
        minConfirmations: parseInt(formData.minConfirmations),
        isActive: formData.isActive,
        priority: parseInt(formData.priority)
      };

      const url = editingBlockchain 
        ? `/api/admin/blockchains/${editingBlockchain.code}`
        : '/api/admin/blockchains';
      
      const res = await fetch(url, {
        method: editingBlockchain ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingBlockchain ? 'Blockchain updated' : 'Blockchain created');
        setIsSheetOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save blockchain');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save blockchain');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (code: string) => {
    setBlockchainToDelete(code);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!blockchainToDelete) return;

    try {
      const res = await fetch(`/api/admin/blockchains/${blockchainToDelete}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Blockchain network deactivated successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to delete blockchain');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete blockchain');
    } finally {
      setBlockchainToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const columns: ColumnDef<BlockchainNetwork>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{row.original.code}</span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Network Name',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            Native: {row.original.nativeToken}
            {row.original.chainId && ` • Chain ID: ${row.original.chainId}`}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'minConfirmations',
      header: 'Confirmations',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.minConfirmations} blocks</Badge>
      ),
    },
    {
      accessorKey: 'usage',
      header: 'Usage',
      cell: ({ row }) => {
        const count = row.original._count;
        if (!count) return <span className="text-muted-foreground">-</span>;
        
        const total = count.userWallets + count.platformWallets + count.orders;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">User:</span>
              <span className="font-medium">{count.userWallets}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-3.5 w-3.5 text-green-500" />
              <span className="text-muted-foreground">Platform:</span>
              <span className="font-medium">{count.platformWallets}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShoppingBag className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-muted-foreground">Orders:</span>
              <span className="font-medium">{count.orders}</span>
            </div>
            {total > 0 && (
              <div className="pt-1 mt-1 border-t">
                <Badge variant="secondary" className="text-xs">
                  Total: {total}
                </Badge>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const blockchain = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEdit(blockchain)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Network
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(blockchain.code);
                  toast.success('Code copied to clipboard');
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  const url = blockchain.explorerUrl;
                  if (url) {
                    // Create temporary link and click it
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    toast.error('Explorer URL not available');
                  }
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Explorer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(blockchain.code)}
                className="text-destructive focus:text-destructive"
              >
                <Power className="mr-2 h-4 w-4" />
                Deactivate
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
          <h1 className="text-3xl font-bold tracking-tight">Blockchain Networks</h1>
          <p className="text-muted-foreground mt-1">
            Manage supported blockchain networks and their configurations
          </p>
        </div>
        <div className="flex gap-2">
          {/* Quick Add TRON button */}
          {!blockchains.some(b => b.code === 'TRON') && (
            <Button 
              onClick={handleQuickAddTron} 
              variant="outline"
              className="gap-2"
            >
              <Network className="h-4 w-4" />
              Quick Add TRON
            </Button>
          )}
          <Button onClick={handleAdd} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Network
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={blockchains}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search networks..."
      />

      {/* Add/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingBlockchain ? 'Edit Blockchain Network' : 'Add Blockchain Network'}
            </SheetTitle>
            <SheetDescription>
              Configure blockchain network settings
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="ETH"
                  disabled={!!editingBlockchain}
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Native Token *</Label>
                <Input
                  value={formData.nativeToken}
                  onChange={(e) => setFormData({ ...formData, nativeToken: e.target.value.toUpperCase() })}
                  placeholder="ETH"
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Network Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ethereum"
              />
            </div>

            <div className="space-y-2">
              <Label>Explorer URL *</Label>
              <Input
                value={formData.explorerUrl}
                onChange={(e) => setFormData({ ...formData, explorerUrl: e.target.value })}
                placeholder="https://etherscan.io"
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label>RPC URL (Optional)</Label>
              <Input
                value={formData.rpcUrl}
                onChange={(e) => setFormData({ ...formData, rpcUrl: e.target.value })}
                placeholder="https://mainnet.infura.io/v3/..."
                type="url"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chain ID (Optional)</Label>
                <Input
                  type="number"
                  value={formData.chainId}
                  onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Min Confirmations</Label>
                <Input
                  type="number"
                  value={formData.minConfirmations}
                  onChange={(e) => setFormData({ ...formData, minConfirmations: e.target.value })}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
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
        title="Are you sure you want to deactivate this blockchain network?"
        description="This will deactivate the network. It won't be available for new wallets or orders. Existing data will be preserved."
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

