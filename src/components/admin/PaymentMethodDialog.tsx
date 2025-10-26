/**
 * Payment Method Dialog Component
 * Create/Edit payment method with connections to payment accounts
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { CreditCard, Save, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: any;
  onSuccess: () => void;
  fiatCurrencies: any[];
  paymentAccounts: any[];
  pspConnectors: any[];
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  method,
  onSuccess,
  fiatCurrencies,
  paymentAccounts,
  pspConnectors
}: PaymentMethodDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'bank_transfer', // bank_transfer, card_payment, instant, crypto_transfer
    direction: 'IN' as 'IN' | 'OUT' | 'BOTH',
    providerType: 'MANUAL' as 'MANUAL' | 'BANK_ACCOUNT' | 'PSP' | 'CRYPTO_WALLET',
    automationLevel: 'MANUAL' as 'MANUAL' | 'SEMI_AUTO' | 'FULLY_AUTO',
    currency: '', // EUR, PLN
    
    // Connections
    paymentAccountId: '', // NEW: unified connection
    pspConnector: '', // For PSP type
    
    // Limits & Fees
    minAmount: '',
    maxAmount: '',
    feeFixed: 0,
    feePercent: 0,
    processingTime: '',
    
    // UI
    instructions: '',
    iconUrl: '',
    priority: 1,
    
    // Status
    isActive: true,
    isAvailableForClients: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (method) {
      setFormData({
        code: method.code || '',
        name: method.name || '',
        description: method.description || '',
        type: method.type || 'bank_transfer',
        direction: method.direction || 'IN',
        providerType: method.providerType || 'MANUAL',
        automationLevel: method.automationLevel || 'MANUAL',
        currency: method.currency || '',
        paymentAccountId: method.paymentAccountId || '',
        pspConnector: method.pspConnector || '',
        minAmount: method.minAmount?.toString() || '',
        maxAmount: method.maxAmount?.toString() || '',
        feeFixed: method.feeFixed || 0,
        feePercent: method.feePercent || 0,
        processingTime: method.processingTime || '',
        instructions: method.instructions || '',
        iconUrl: method.iconUrl || '',
        priority: method.priority || 1,
        isActive: method.isActive ?? true,
        isAvailableForClients: method.isAvailableForClients ?? true,
      });
    } else {
      // Reset for new method
      setFormData({
        code: '',
        name: '',
        description: '',
        type: 'bank_transfer',
        direction: 'IN',
        providerType: 'MANUAL',
        automationLevel: 'MANUAL',
        currency: '',
        paymentAccountId: '',
        pspConnector: '',
        minAmount: '',
        maxAmount: '',
        feeFixed: 0,
        feePercent: 0,
        processingTime: '',
        instructions: '',
        iconUrl: '',
        priority: 1,
        isActive: true,
        isAvailableForClients: true,
      });
    }
  }, [method, open]);

  const handleSave = async () => {
    // Basic validation
    if (!formData.code || !formData.name) {
      toast.error('Please fill required fields (code, name)');
      return;
    }

    // Currency required for all except CRYPTO_WALLET (gets it from wallet)
    if (formData.providerType !== 'CRYPTO_WALLET' && !formData.currency) {
      toast.error('Please select a currency');
      return;
    }

    // Validate connections based on provider type
    if (formData.providerType === 'BANK_ACCOUNT' || formData.providerType === 'CRYPTO_WALLET') {
      if (!formData.paymentAccountId) {
        toast.error('Please select a payment account');
        return;
      }
    }
    if (formData.providerType === 'PSP' && !formData.pspConnector) {
      toast.error('Please select a PSP connector');
      return;
    }

    setSaving(true);
    try {
      const endpoint = method
        ? `/api/admin/payment-methods/${method.code}`
        : '/api/admin/payment-methods';
      
      const methodType = method ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        minAmount: formData.minAmount ? parseFloat(formData.minAmount) : null,
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
      };

      const response = await fetch(endpoint, {
        method: methodType,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Payment method ${method ? 'updated' : 'created'} successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to save payment method');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const currencyOptions = fiatCurrencies.map(c => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
    description: c.symbol
  }));

  // Filter payment accounts by provider type
  const filteredAccounts = paymentAccounts.filter(acc => {
    if (formData.providerType === 'BANK_ACCOUNT') return acc.type === 'BANK_ACCOUNT';
    if (formData.providerType === 'CRYPTO_WALLET') return acc.type === 'CRYPTO_WALLET';
    return false;
  });

  const accountOptions = filteredAccounts.map(acc => ({
    value: acc.id,
    label: acc.name,
    description: `${acc.code} - ${acc.fiatCurrency?.code || acc.cryptocurrency?.code || ''}`
  }));

  const pspOptions = pspConnectors.map(psp => ({
    value: psp.code,
    label: psp.name,
    description: psp.settlementCurrency
  }));

  // Debug logging
  console.log('💳 PaymentMethodDialog state:', {
    providerType: formData.providerType,
    paymentAccounts: paymentAccounts.length,
    bankAccounts: paymentAccounts.filter(a => a.type === 'BANK_ACCOUNT').length,
    cryptoWallets: paymentAccounts.filter(a => a.type === 'CRYPTO_WALLET').length,
    filteredAccounts: filteredAccounts.length,
    pspConnectors: pspConnectors.length,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {method ? 'Edit' : 'Create'} Payment Method
          </DialogTitle>
          <DialogDescription>
            Configure payment method with connections to accounts or PSP providers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Basic Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Method Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="sepa_eur"
                  disabled={!!method}
                />
                {method && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cannot be changed
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Method Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="SEPA Transfer (EUR)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="European bank transfer via SEPA..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Payment Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card_payment">Card Payment</SelectItem>
                    <SelectItem value="instant">Instant Payment</SelectItem>
                    <SelectItem value="crypto_transfer">Crypto Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Currency field - hidden for CRYPTO_WALLET */}
              {formData.providerType !== 'CRYPTO_WALLET' && (
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Combobox
                    options={currencyOptions}
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    placeholder="Select currency..."
                  />
                </div>
              )}
              
              {formData.providerType === 'CRYPTO_WALLET' && (
                <div>
                  <Label htmlFor="currency-info">Currency</Label>
                  <div className="flex items-center h-10 px-3 py-2 text-sm border rounded-md bg-muted">
                    <p className="text-muted-foreground">
                      Determined by crypto wallet
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Currency will be auto-filled from selected wallet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Direction & Provider */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Payment Flow Configuration</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="direction">Direction *</Label>
                <Select value={formData.direction} onValueChange={(value: any) => setFormData({ ...formData, direction: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 text-xs">IN</Badge>
                        <span>Pay-In Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="OUT">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 text-xs">OUT</Badge>
                        <span>Pay-Out Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="BOTH">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 text-xs">BOTH</Badge>
                        <span>Both Directions</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.direction === 'IN' && 'Client → Platform (deposits)'}
                  {formData.direction === 'OUT' && 'Platform → Client (payouts)'}
                  {formData.direction === 'BOTH' && 'Both directions supported'}
                </p>
              </div>

              <div>
                <Label htmlFor="providerType">Provider Type *</Label>
                <Select 
                  value={formData.providerType} 
                  onValueChange={(value: any) => setFormData({ 
                    ...formData, 
                    providerType: value,
                    paymentAccountId: '', // Reset connection
                    pspConnector: ''
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual Processing</SelectItem>
                    <SelectItem value="BANK_ACCOUNT">Bank Account</SelectItem>
                    <SelectItem value="CRYPTO_WALLET">Crypto Wallet</SelectItem>
                    <SelectItem value="PSP">PSP Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="automationLevel">Automation Level</Label>
                <Select value={formData.automationLevel} onValueChange={(value: any) => setFormData({ ...formData, automationLevel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-700">Manual</Badge>
                    </SelectItem>
                    <SelectItem value="SEMI_AUTO">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Semi-Auto</Badge>
                    </SelectItem>
                    <SelectItem value="FULLY_AUTO">
                      <Badge variant="outline" className="bg-green-500/10 text-green-700">Fully Auto</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Connection Selection */}
            {(formData.providerType === 'BANK_ACCOUNT' || formData.providerType === 'CRYPTO_WALLET') && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label htmlFor="paymentAccount">Connected {formData.providerType === 'BANK_ACCOUNT' ? 'Bank Account' : 'Crypto Wallet'} *</Label>
                <Combobox
                  options={accountOptions}
                  value={formData.paymentAccountId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, paymentAccountId: value });
                    
                    // Auto-fill currency from crypto wallet
                    if (formData.providerType === 'CRYPTO_WALLET') {
                      const selectedWallet = filteredAccounts.find(acc => acc.id === value);
                      if (selectedWallet?.cryptocurrency?.code) {
                        setFormData(prev => ({ 
                          ...prev, 
                          paymentAccountId: value,
                          currency: selectedWallet.cryptocurrency.code 
                        }));
                      }
                    }
                  }}
                  placeholder={`Select ${formData.providerType === 'BANK_ACCOUNT' ? 'bank account' : 'crypto wallet'}...`}
                  className="mt-2"
                />
                {filteredAccounts.length === 0 && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-yellow-700">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>No {formData.providerType === 'BANK_ACCOUNT' ? 'bank accounts' : 'crypto wallets'} available. Create one first in the respective tab.</p>
                  </div>
                )}
                {formData.providerType === 'CRYPTO_WALLET' && formData.paymentAccountId && (
                  <p className="text-xs text-green-700 mt-2">
                    ✓ Currency will be auto-filled from selected wallet
                  </p>
                )}
              </div>
            )}

            {formData.providerType === 'PSP' && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label htmlFor="pspConnector">PSP Connector *</Label>
                <Combobox
                  options={pspOptions}
                  value={formData.pspConnector}
                  onValueChange={(value) => setFormData({ ...formData, pspConnector: value })}
                  placeholder="Select PSP provider..."
                  className="mt-2"
                />
                {pspConnectors.length === 0 && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-yellow-700">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>No PSP connectors configured. Configure one in PSP Providers tab.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Limits & Fees */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Limits & Fees</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minAmount">Minimum Amount</Label>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  placeholder="50.00"
                />
              </div>

              <div>
                <Label htmlFor="maxAmount">Maximum Amount</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  placeholder="10000.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feeFixed">Fixed Fee (in currency)</Label>
                <Input
                  id="feeFixed"
                  type="number"
                  step="0.01"
                  value={formData.feeFixed}
                  onChange={(e) => setFormData({ ...formData, feeFixed: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="feePercent">Fee Percentage (%)</Label>
                <Input
                  id="feePercent"
                  type="number"
                  step="0.01"
                  value={formData.feePercent}
                  onChange={(e) => setFormData({ ...formData, feePercent: parseFloat(e.target.value) || 0 })}
                  placeholder="1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="processingTime">Processing Time</Label>
              <Input
                id="processingTime"
                value={formData.processingTime}
                onChange={(e) => setFormData({ ...formData, processingTime: e.target.value })}
                placeholder="1-3 business days"
              />
            </div>
          </div>

          {/* Instructions & Display */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Display & Instructions</h4>
            
            <div>
              <Label htmlFor="instructions">Payment Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Instructions for users..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="iconUrl">Icon URL (optional)</Label>
                <Input
                  id="iconUrl"
                  value={formData.iconUrl}
                  onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  placeholder="https://..."
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

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Status Settings</h4>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable payment method
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Available for Clients</Label>
                <p className="text-sm text-muted-foreground">
                  Show to clients in payment selection
                </p>
              </div>
              <Switch
                checked={formData.isAvailableForClients}
                onCheckedChange={(checked) => setFormData({ ...formData, isAvailableForClients: checked })}
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
            {saving ? 'Saving...' : method ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

