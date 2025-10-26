/**
 * PSP Provider Dialog Component
 * Create/Edit PSP connector configuration
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Globe, Save, Plus, X } from 'lucide-react';

interface PSPProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: any;
  onSuccess: () => void;
}

export function PSPProviderDialog({
  open,
  onOpenChange,
  provider,
  onSuccess
}: PSPProviderDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    capabilities: [] as string[],
    settlementCurrency: 'EUR',
    status: 'unconfigured' as 'active' | 'inactive' | 'testing' | 'unconfigured',
    isEnabled: false,
  });
  const [newCapability, setNewCapability] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (provider) {
      setFormData({
        code: provider.code || '',
        name: provider.name || '',
        capabilities: provider.capabilities || [],
        settlementCurrency: provider.settlementCurrency || 'EUR',
        status: provider.status || 'unconfigured',
        isEnabled: provider.isEnabled ?? false,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        capabilities: [],
        settlementCurrency: 'EUR',
        status: 'unconfigured',
        isEnabled: false,
      });
    }
  }, [provider, open]);

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Please fill required fields');
      return;
    }

    if (formData.capabilities.length === 0) {
      toast.error('Please add at least one capability');
      return;
    }

    setSaving(true);
    try {
      const endpoint = provider
        ? `/api/admin/resources/psp-connectors/${provider.code}`
        : '/api/admin/resources/psp-connectors';
      
      const method = provider ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`PSP provider ${provider ? 'updated' : 'created'} successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to save PSP provider');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const addCapability = () => {
    if (!newCapability.trim()) return;
    if (formData.capabilities.includes(newCapability.trim())) {
      toast.error('Capability already added');
      return;
    }
    setFormData({
      ...formData,
      capabilities: [...formData.capabilities, newCapability.trim()]
    });
    setNewCapability('');
  };

  const removeCapability = (capability: string) => {
    setFormData({
      ...formData,
      capabilities: formData.capabilities.filter(c => c !== capability)
    });
  };

  const statusColors = {
    active: 'bg-green-500/10 text-green-700',
    inactive: 'bg-gray-500/10 text-gray-700',
    testing: 'bg-yellow-500/10 text-yellow-700',
    unconfigured: 'bg-red-500/10 text-red-700',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {provider ? 'Edit' : 'Create'} PSP Provider
          </DialogTitle>
          <DialogDescription>
            Configure payment service provider integration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Provider Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Provider Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="stripe"
                  disabled={!!provider}
                />
                {provider && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cannot be changed
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Provider Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Stripe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settlementCurrency">Settlement Currency</Label>
                <Select 
                  value={formData.settlementCurrency} 
                  onValueChange={(value) => setFormData({ ...formData, settlementCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors.active}>Active</Badge>
                        <span className="text-xs">Fully operational</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="testing">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors.testing}>Testing</Badge>
                        <span className="text-xs">In test mode</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors.inactive}>Inactive</Badge>
                        <span className="text-xs">Temporarily disabled</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="unconfigured">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors.unconfigured}>Unconfigured</Badge>
                        <span className="text-xs">Not set up yet</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Capabilities *</h4>
            <p className="text-xs text-muted-foreground">
              Payment methods this provider supports (e.g., card, bank, blik, instant)
            </p>
            
            <div className="flex gap-2">
              <Input
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCapability();
                  }
                }}
                placeholder="card, bank, blik..."
                className="flex-1"
              />
              <Button type="button" onClick={addCapability} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                {formData.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="gap-1">
                    {capability}
                    <button
                      type="button"
                      onClick={() => removeCapability(capability)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {formData.capabilities.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                No capabilities added yet. Add at least one.
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Settings</h4>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Enable Provider</Label>
                <p className="text-sm text-muted-foreground">
                  Allow this provider to process payments
                </p>
              </div>
              <Switch
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
            </div>
          </div>

          {/* Info Note */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> API credentials and webhook configuration should be set up in the provider's settings after creation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : provider ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

