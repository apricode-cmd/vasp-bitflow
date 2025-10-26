/**
 * Add Wallet Dialog Component
 * 
 * Dialog for adding new cryptocurrency wallet address
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/shared/Combobox';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  blockchainNetworks: Array<{
    blockchain: {
      code: string;
      name: string;
      symbol: string;
    };
  }>;
}

interface AddWalletDialogProps {
  triggerVariant?: 'default' | 'ghost' | 'outline';
}

export function AddWalletDialog({ triggerVariant = 'default' }: AddWalletDialogProps): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');

  // Load currencies when dialog opens
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    
    if (newOpen && currencies.length === 0) {
      setDataLoading(true);
      try {
        const response = await fetch('/api/admin/resources/currencies?active=true&includeBlockchains=true');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setCurrencies(data.data);
        }
      } catch (error) {
        toast.error('Failed to load currencies');
      } finally {
        setDataLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCurrency || !selectedNetwork || !address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currencyCode: selectedCurrency,
          blockchainCode: selectedNetwork,
          address,
          label: label || undefined
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Wallet address added successfully');
        setOpen(false);
        
        // Reset form
        setSelectedCurrency('');
        setSelectedNetwork('');
        setAddress('');
        setLabel('');
        
        // Refresh page
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to add wallet');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions = currencies.map(c => ({
    value: c.code,
    label: c.name,
    description: c.symbol
  }));

  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency);
  const networkOptions = selectedCurrencyData?.blockchainNetworks.map(bn => ({
    value: bn.blockchain.code,
    label: bn.blockchain.name,
    description: bn.blockchain.symbol
  })) || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Add Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Wallet Address</DialogTitle>
            <DialogDescription>
              Save a new cryptocurrency wallet address for quick reuse in orders
            </DialogDescription>
          </DialogHeader>

          {dataLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Cryptocurrency *</Label>
                <Combobox
                  options={currencyOptions}
                  value={selectedCurrency}
                  onValueChange={(value) => {
                    setSelectedCurrency(value);
                    setSelectedNetwork(''); // Reset network when currency changes
                  }}
                  placeholder="Select cryptocurrency"
                  emptyText="No cryptocurrencies found"
                />
              </div>

              {/* Network */}
              {selectedCurrency && (
                <div className="space-y-2">
                  <Label htmlFor="network">Blockchain Network *</Label>
                  <Combobox
                    options={networkOptions}
                    value={selectedNetwork}
                    onValueChange={setSelectedNetwork}
                    placeholder="Select network"
                    emptyText="No networks available"
                  />
                </div>
              )}

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Wallet Address *</Label>
                <Input
                  id="address"
                  placeholder="Enter wallet address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {/* Label (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="label">Label (Optional)</Label>
                <Input
                  id="label"
                  placeholder="e.g., My Main Wallet"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || dataLoading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Wallet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


