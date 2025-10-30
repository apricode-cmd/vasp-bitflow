/**
 * Crypto Wallet Dialog Component
 * Create/Edit crypto wallet
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { Wallet, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CryptoWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: any;
  onSuccess: () => void;
  cryptocurrencies: any[];
  blockchains: any[];
}

export function CryptoWalletDialog({
  open,
  onOpenChange,
  wallet,
  onSuccess,
  cryptocurrencies,
  blockchains
}: CryptoWalletDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    cryptocurrencyCode: '',
    blockchainCode: '',
    address: '',
    memo: '',
    balance: 0,
    minBalance: 0,
    instructions: '',
    isActive: true,
    isDefault: false,
    priority: 1,
    alertsEnabled: false,
  });
  const [saving, setSaving] = useState(false);

  // Reset blockchain when cryptocurrency changes
  useEffect(() => {
    if (formData.cryptocurrencyCode) {
      // Check if current blockchain is valid for selected cryptocurrency
      const selectedCrypto = cryptocurrencies.find(c => c.code === formData.cryptocurrencyCode);
      const validBlockchains = selectedCrypto?.blockchainNetworks?.map((bn: any) => bn.blockchainCode) || [];
      
      if (formData.blockchainCode && !validBlockchains.includes(formData.blockchainCode)) {
        // Reset blockchain if it's not valid for the selected cryptocurrency
        setFormData(prev => ({ ...prev, blockchainCode: '' }));
      }
    }
  }, [formData.cryptocurrencyCode, cryptocurrencies]);

  // Filter blockchains based on selected cryptocurrency
  const availableBlockchains = useMemo(() => {
    if (!formData.cryptocurrencyCode) {
      return blockchains;
    }

    const selectedCrypto = cryptocurrencies.find(c => c.code === formData.cryptocurrencyCode);
    
    console.log('🔍 Selected crypto:', selectedCrypto);
    console.log('📦 blockchainNetworks:', selectedCrypto?.blockchainNetworks);
    
    if (!selectedCrypto || !selectedCrypto.blockchainNetworks) {
      return [];
    }

    // Get blockchain codes that are linked to this cryptocurrency
    // blockchainNetworks structure: [{ blockchainCode: 'ETHEREUM', blockchain: { code: 'ETHEREUM', name: '...' }, ... }]
    const linkedBlockchainCodes = selectedCrypto.blockchainNetworks
      .filter((bn: any) => bn.isActive)
      .map((bn: any) => bn.blockchain?.code || bn.blockchainCode); // Try both paths

    console.log('🔗 Linked blockchain codes:', linkedBlockchainCodes);
    console.log('📋 All blockchains:', blockchains.map(b => b.code));

    // Filter blockchains to only show linked ones
    const filtered = blockchains.filter(b => linkedBlockchainCodes.includes(b.code));
    
    console.log('✅ Filtered blockchains:', filtered.map(b => b.code));

    return filtered;
  }, [formData.cryptocurrencyCode, cryptocurrencies, blockchains]);

  useEffect(() => {
    if (wallet) {
      setFormData({
        code: wallet.code || '',
        name: wallet.name || '',
        description: wallet.description || '',
        cryptocurrencyCode: wallet.cryptocurrency?.code || '',
        blockchainCode: wallet.blockchain?.code || '',
        address: wallet.address || '',
        memo: wallet.memo || '',
        balance: wallet.balance || 0,
        minBalance: wallet.minBalance || 0,
        instructions: wallet.instructions || '',
        isActive: wallet.isActive ?? true,
        isDefault: wallet.isDefault ?? false,
        priority: wallet.priority || 1,
        alertsEnabled: wallet.alertsEnabled ?? false,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        cryptocurrencyCode: '',
        blockchainCode: '',
        address: '',
        memo: '',
        balance: 0,
        minBalance: 0,
        instructions: '',
        isActive: true,
        isDefault: false,
        priority: 1,
        alertsEnabled: false,
      });
    }
  }, [wallet, open]);

  const handleSave = async () => {
    if (!formData.name || !formData.cryptocurrencyCode || !formData.blockchainCode || !formData.address) {
      toast.error('Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      const endpoint = wallet
        ? `/api/admin/payment-accounts/${wallet.id}`
        : '/api/admin/payment-accounts';
      
      const method = wallet ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        type: 'CRYPTO_WALLET',
      };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Crypto wallet ${wallet ? 'updated' : 'created'} successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to save wallet');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const cryptoOptions = cryptocurrencies.map(c => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
    description: c.symbol
  }));

  const blockchainOptions = availableBlockchains.map(b => ({
    value: b.code,
    label: b.name,
    description: b.nativeToken
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {wallet ? 'Edit' : 'Create'} Crypto Wallet
          </DialogTitle>
          <DialogDescription>
            Configure a cryptocurrency wallet for sending payouts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Wallet Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="btc_hot_wallet"
                  disabled={!!wallet}
                />
                {wallet && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cannot be changed
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Wallet Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="BTC Hot Wallet"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Hot wallet for BTC payouts..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crypto">Cryptocurrency *</Label>
                <Combobox
                  options={cryptoOptions}
                  value={formData.cryptocurrencyCode}
                  onValueChange={(value) => setFormData({ ...formData, cryptocurrencyCode: value, blockchainCode: '' })}
                  placeholder="Select cryptocurrency..."
                />
              </div>

              <div>
                <Label htmlFor="blockchain">Blockchain Network *</Label>
                <Combobox
                  options={blockchainOptions}
                  value={formData.blockchainCode}
                  onValueChange={(value) => setFormData({ ...formData, blockchainCode: value })}
                  placeholder="Select network..."
                  disabled={!formData.cryptocurrencyCode || blockchainOptions.length === 0}
                />
                {formData.cryptocurrencyCode && blockchainOptions.length === 0 && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      No blockchains configured for this cryptocurrency. Please configure in <strong>/admin/currencies</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>

          {/* Wallet Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Wallet Details</h4>
            
            <div>
              <Label htmlFor="address">Wallet Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="0x..."
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="memo">Memo/Tag (optional)</Label>
              <Input
                id="memo"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                placeholder="For XRP, XLM, etc."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for some networks (XRP, XLM)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.00000001"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.5"
                />
              </div>

              <div>
                <Label htmlFor="minBalance">Minimum Balance</Label>
                <Input
                  id="minBalance"
                  type="number"
                  step="0.00000001"
                  value={formData.minBalance}
                  onChange={(e) => setFormData({ ...formData, minBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alert when balance is low
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Internal notes about this wallet..."
                rows={3}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Settings</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable for sending payouts
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Default Wallet</Label>
                <p className="text-sm text-muted-foreground">
                  Use as primary for this currency
                </p>
              </div>
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Balance Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when below minimum
                </p>
              </div>
              <Switch
                checked={formData.alertsEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, alertsEnabled: checked })}
              />
            </div>

            <div>
              <Label htmlFor="priority">Display Priority</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : wallet ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

