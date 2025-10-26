/**
 * Bank Account Dialog Component
 * Create/Edit bank account
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/shared/Combobox';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: any;
  onSuccess: () => void;
  currencies: any[];
}

export function BankAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
  currencies
}: BankAccountDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    fiatCurrencyCode: '',
    accountHolder: '',
    bankName: '',
    bankAddress: '',
    iban: '',
    swift: '',
    bic: '',
    referenceTemplate: '',
    instructions: '',
    isActive: true,
    isDefault: false,
    priority: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code || '',
        name: account.name || '',
        description: account.description || '',
        fiatCurrencyCode: account.fiatCurrency?.code || '',
        accountHolder: account.accountHolder || '',
        bankName: account.bankName || '',
        bankAddress: account.bankAddress || '',
        iban: account.iban || '',
        swift: account.swift || '',
        bic: account.bic || '',
        referenceTemplate: account.referenceTemplate || '',
        instructions: account.instructions || '',
        isActive: account.isActive ?? true,
        isDefault: account.isDefault ?? false,
        priority: account.priority || 1,
      });
    } else {
      // Reset for new account
      setFormData({
        code: '',
        name: '',
        description: '',
        fiatCurrencyCode: '',
        accountHolder: '',
        bankName: '',
        bankAddress: '',
        iban: '',
        swift: '',
        bic: '',
        referenceTemplate: '',
        instructions: '',
        isActive: true,
        isDefault: false,
        priority: 1,
      });
    }
  }, [account, open]);

  const handleSave = async () => {
    if (!formData.name || !formData.fiatCurrencyCode) {
      toast.error('Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      const endpoint = account
        ? `/api/admin/payment-accounts/${account.id}`
        : '/api/admin/payment-accounts';
      
      const method = account ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        type: 'BANK_ACCOUNT',
      };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Bank account ${account ? 'updated' : 'created'} successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to save bank account');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const currencyOptions = currencies.map(c => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
    description: c.symbol
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {account ? 'Edit' : 'Create'} Bank Account
          </DialogTitle>
          <DialogDescription>
            Configure a fiat currency bank account for receiving payments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Account Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="sepa_eur_main"
                  disabled={!!account}
                />
                {account && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cannot be changed
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Combobox
                  options={currencyOptions}
                  value={formData.fiatCurrencyCode}
                  onValueChange={(value) => setFormData({ ...formData, fiatCurrencyCode: value })}
                  placeholder="Select currency..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Main EUR SEPA Account"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Primary account for EUR payments..."
                rows={2}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Bank Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Deutsche Bank AG"
                />
              </div>

              <div>
                <Label htmlFor="accountHolder">Account Holder</Label>
                <Input
                  id="accountHolder"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  placeholder="Company Name Ltd"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bankAddress">Bank Address</Label>
              <Input
                id="bankAddress"
                value={formData.bankAddress}
                onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                placeholder="Frankfurt, Germany"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  placeholder="DE89370400440532013000"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="swift">SWIFT</Label>
                <Input
                  id="swift"
                  value={formData.swift}
                  onChange={(e) => setFormData({ ...formData, swift: e.target.value })}
                  placeholder="COBADEFFXXX"
                />
              </div>

              <div>
                <Label htmlFor="bic">BIC</Label>
                <Input
                  id="bic"
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                  placeholder="COBADEFF"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="referenceTemplate">Reference Template</Label>
              <Input
                id="referenceTemplate"
                value={formData.referenceTemplate}
                onChange={(e) => setFormData({ ...formData, referenceTemplate: e.target.value })}
                placeholder="APR-{orderId}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{orderId}'} for order ID placeholder
              </p>
            </div>

            <div>
              <Label htmlFor="instructions">Payment Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Please include reference number in transfer description..."
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
                  Enable for receiving payments
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Default Account</Label>
                <p className="text-sm text-muted-foreground">
                  Use as primary for this currency
                </p>
              </div>
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
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
            {saving ? 'Saving...' : account ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

