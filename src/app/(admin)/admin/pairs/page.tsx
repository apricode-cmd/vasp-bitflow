/**
 * Trading Pairs Management Page
 * Manage cryptocurrency/fiat trading pairs with limits and fees
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
import { Plus, MoreHorizontal, ArrowUpDown } from 'lucide-react';
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

interface TradingPair {
  id: string;
  cryptoCode: string;
  fiatCode: string;
  minCryptoAmount: number;
  maxCryptoAmount: number;
  minFiatAmount: number;
  maxFiatAmount: number;
  feePercent: number;
  isActive: boolean;
  priority: number;
  crypto?: {
    code: string;
    name: string;
    symbol: string;
  };
  fiat?: {
    code: string;
    name: string;
    symbol: string;
  };
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface FiatCurrency {
  code: string;
  name: string;
  symbol: string;
}

export default function TradingPairsPage(): JSX.Element {
  const [pairs, setPairs] = React.useState<TradingPair[]>([]);
  const [cryptoCurrencies, setCryptoCurrencies] = React.useState<Currency[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = React.useState<FiatCurrency[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingPair, setEditingPair] = React.useState<TradingPair | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [pairToDelete, setPairToDelete] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    cryptoCode: '',
    fiatCode: '',
    minCryptoAmount: '',
    maxCryptoAmount: '',
    minFiatAmount: '',
    maxFiatAmount: '',
    feePercent: '1.5',
    isActive: true,
    priority: '0'
  });

  // Fetch data
  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pairsRes, cryptoRes, fiatRes] = await Promise.all([
        fetch('/api/admin/trading-pairs'),
        fetch('/api/admin/resources/currencies?active=true'), // Only active crypto
        fetch('/api/admin/resources/fiat-currencies?active=true') // Only active fiat
      ]);

      const pairsData = await pairsRes.json();
      const cryptoData = await cryptoRes.json();
      const fiatData = await fiatRes.json();

      if (pairsData.success) setPairs(pairsData.data);
      if (cryptoData.success) setCryptoCurrencies(cryptoData.data);
      if (fiatData.success) setFiatCurrencies(fiatData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Combobox options
  const cryptoOptions: ComboboxOption[] = React.useMemo(() => 
    cryptoCurrencies.map(c => ({
      value: c.code,
      label: `${c.symbol} ${c.code} - ${c.name}`
    })),
    [cryptoCurrencies]
  );

  const fiatOptions: ComboboxOption[] = React.useMemo(() =>
    fiatCurrencies.map(f => ({
      value: f.code,
      label: `${f.symbol} ${f.code} - ${f.name}`
    })),
    [fiatCurrencies]
  );

  const handleAdd = () => {
    setEditingPair(null);
    setFormData({
      cryptoCode: '',
      fiatCode: '',
      minCryptoAmount: '',
      maxCryptoAmount: '',
      minFiatAmount: '',
      maxFiatAmount: '',
      feePercent: '1.5',
      isActive: true,
      priority: '0'
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (pair: TradingPair) => {
    setEditingPair(pair);
    setFormData({
      cryptoCode: pair.cryptoCode,
      fiatCode: pair.fiatCode,
      minCryptoAmount: pair.minCryptoAmount.toString(),
      maxCryptoAmount: pair.maxCryptoAmount.toString(),
      minFiatAmount: pair.minFiatAmount.toString(),
      maxFiatAmount: pair.maxFiatAmount.toString(),
      feePercent: pair.feePercent.toString(),
      isActive: pair.isActive,
      priority: pair.priority.toString()
    });
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        cryptoCode: formData.cryptoCode,
        fiatCode: formData.fiatCode,
        minCryptoAmount: parseFloat(formData.minCryptoAmount),
        maxCryptoAmount: parseFloat(formData.maxCryptoAmount),
        minFiatAmount: parseFloat(formData.minFiatAmount),
        maxFiatAmount: parseFloat(formData.maxFiatAmount),
        feePercent: parseFloat(formData.feePercent),
        isActive: formData.isActive,
        priority: parseInt(formData.priority)
      };

      const url = editingPair 
        ? `/api/admin/trading-pairs/${editingPair.id}`
        : '/api/admin/trading-pairs';
      
      const res = await fetch(url, {
        method: editingPair ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingPair ? 'Pair updated' : 'Pair created');
        setIsSheetOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save pair');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save pair');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPairToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pairToDelete) return;

    try {
      const res = await fetch(`/api/admin/trading-pairs/${pairToDelete}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Trading pair deleted successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to delete pair');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete pair');
    } finally {
      setPairToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/trading-pairs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      const data = await res.json();

      if (data.success) {
        toast.success(isActive ? 'Pair deactivated' : 'Pair activated');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to update pair');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to update pair');
    }
  };

  const columns: ColumnDef<TradingPair>[] = [
    {
      accessorKey: 'pair',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Trading Pair
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const crypto = row.original.crypto;
        const fiat = row.original.fiat;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{crypto?.code || '-'}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline">{fiat?.code || '-'}</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'limits',
      header: 'Order Limits',
      cell: ({ row }) => (
        <div className="text-sm space-y-1">
          <div className="font-medium">Crypto: {row.original.minCryptoAmount} - {row.original.maxCryptoAmount}</div>
          <div className="text-muted-foreground">Fiat: {row.original.minFiatAmount} - {row.original.maxFiatAmount}</div>
        </div>
      ),
    },
    {
      accessorKey: 'feePercent',
      header: 'Fee',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.feePercent}%</Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => row.original.priority,
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
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleActive(row.original.id, row.original.isActive)}>
              {row.original.isActive ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Pairs</h1>
          <p className="text-muted-foreground">
            Manage cryptocurrency/fiat trading pairs with limits and fees
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pair
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={pairs}
        searchKey="pair"
        searchPlaceholder="Search pairs..."
        isLoading={isLoading}
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPair ? 'Edit Trading Pair' : 'Add Trading Pair'}</SheetTitle>
            <SheetDescription>
              {editingPair ? 'Update trading pair settings' : 'Create a new trading pair'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Cryptocurrency</Label>
              <Combobox
                options={cryptoOptions}
                value={formData.cryptoCode}
                onValueChange={(value) => setFormData({ ...formData, cryptoCode: value })}
                placeholder="Select crypto..."
              />
            </div>

            <div className="space-y-2">
              <Label>Fiat Currency</Label>
              <Combobox
                options={fiatOptions}
                value={formData.fiatCode}
                onValueChange={(value) => setFormData({ ...formData, fiatCode: value })}
                placeholder="Select fiat..."
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Crypto Amount</Label>
              <Input
                type="number"
                value={formData.minCryptoAmount}
                onChange={(e) => setFormData({ ...formData, minCryptoAmount: e.target.value })}
                placeholder="0.001"
                step="0.00001"
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Crypto Amount</Label>
              <Input
                type="number"
                value={formData.maxCryptoAmount}
                onChange={(e) => setFormData({ ...formData, maxCryptoAmount: e.target.value })}
                placeholder="10"
                step="0.001"
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Fiat Amount</Label>
              <Input
                type="number"
                value={formData.minFiatAmount}
                onChange={(e) => setFormData({ ...formData, minFiatAmount: e.target.value })}
                placeholder="50"
                step="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Fiat Amount</Label>
              <Input
                type="number"
                value={formData.maxFiatAmount}
                onChange={(e) => setFormData({ ...formData, maxFiatAmount: e.target.value })}
                placeholder="10000"
                step="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Fee Percent</Label>
              <Input
                type="number"
                value={formData.feePercent}
                onChange={(e) => setFormData({ ...formData, feePercent: e.target.value })}
                placeholder="1.5"
                step="0.1"
              />
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
        title="Are you sure you want to delete this trading pair?"
        description="This action cannot be undone. This will permanently deactivate the trading pair and it will no longer be available for new orders."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
