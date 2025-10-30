/**
 * Integrations Management Page
 * 
 * Enterprise-grade interface with search and filters
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Shield, Mail, TrendingUp, CreditCard, Loader2, 
  CheckCircle, XCircle, RefreshCw, Settings, Plug, 
  Check, Search, Filter
} from 'lucide-react';

// Integration categories with icons
const CATEGORY_CONFIG = {
  KYC: {
    label: 'KYC',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  RATES: {
    label: 'Rates',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  EMAIL: {
    label: 'Email',
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  PAYMENT: {
    label: 'Payment',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  }
};

interface Integration {
  service: string;
  category: string;
  displayName: string;
  description: string;
  icon?: string;
  isEnabled: boolean;
  status: 'active' | 'inactive' | 'error';
  apiKey?: string;
  apiEndpoint?: string;
  lastTested?: Date | null;
  config?: Record<string, any>;
}

export default function IntegrationsPage(): JSX.Element {
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/admin/integrations');
      const data = await response.json();
      
      if (data.success && data.integrations && Array.isArray(data.integrations)) {
        const integrationsMap: Record<string, Integration> = {};
        data.integrations.forEach((int: any) => {
          integrationsMap[int.service] = {
            ...int,
            lastTested: int.lastTested ? new Date(int.lastTested) : null
          };
        });
        setIntegrations(integrationsMap);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const updateIntegration = (service: string, updates: Partial<Integration>) => {
    setIntegrations(prev => ({
      ...prev,
      [service]: { ...prev[service], ...updates }
    }));
    
    if (selectedIntegration?.service === service) {
      setSelectedIntegration(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleToggle = async (service: string, enabled: boolean) => {
    // Temporarily update UI
    updateIntegration(service, { isEnabled: enabled });
    
    // Save only the enabled status change
    setSaving(true);
    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          updates: {
            isEnabled: enabled
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(enabled ? 'Integration enabled' : 'Integration disabled');
        // Update with response data
        if (data.integration) {
          updateIntegration(service, data.integration);
        }
      } else {
        // Revert on error
        updateIntegration(service, { isEnabled: !enabled });
        toast.error(data.error || 'Failed to update');
      }
    } catch (error: any) {
      // Revert on error
      updateIntegration(service, { isEnabled: !enabled });
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (service: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          updates: integrations[service]
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Saved successfully');
        updateIntegration(service, data.integration);
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service: string) => {
    setTesting(service);
    try {
      const response = await fetch(`/api/admin/integrations/${service}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Connection successful');
        updateIntegration(service, { 
          status: 'active', 
          lastTested: new Date()
        });
        await handleSave(service);
      } else {
        toast.error(data.message || 'Connection failed');
        updateIntegration(service, { status: 'error' });
      }
    } catch (error: any) {
      toast.error('Test failed');
      updateIntegration(service, { status: 'error' });
    } finally {
      setTesting(null);
    }
  };

  const openConfigModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setConfigModalOpen(false);
    setSelectedIntegration(null);
  };

  // Filtered integrations
  const filteredIntegrations = useMemo(() => {
    return Object.values(integrations).filter(integration => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          integration.displayName.toLowerCase().includes(query) ||
          integration.description.toLowerCase().includes(query) ||
          integration.service.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && integration.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'enabled' && !integration.isEnabled) return false;
      if (statusFilter === 'disabled' && integration.isEnabled) return false;
      if (statusFilter === 'active' && integration.status !== 'active') return false;

      return true;
    });
  }, [integrations, searchQuery, categoryFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderIntegrationCard = (integration: Integration) => {
    const categoryConfig = CATEGORY_CONFIG[integration.category as keyof typeof CATEGORY_CONFIG];
    const CategoryIcon = categoryConfig?.icon || Plug;
    
    const providerExamples: Record<string, string> = {
      'kycaid': 'Identity verification, AML checks',
      'coingecko': 'Live crypto rates',
      'resend': 'Transactional emails'
    };
    
    return (
      <Card 
        key={integration.service} 
        className="group hover:shadow-xl transition-all duration-200 border-2 border-primary/20 hover:border-primary/40"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${categoryConfig?.bgColor}`}>
                <CategoryIcon className={`h-6 w-6 ${categoryConfig?.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{integration.displayName}</CardTitle>
                  {integration.icon && <span className="text-xl">{integration.icon}</span>}
                </div>
                {providerExamples[integration.service] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {providerExamples[integration.service]}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status & Last Tested */}
          <div className="flex items-center justify-between">
            <Badge 
              variant={integration.status === 'active' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {integration.status === 'active' ? (
                <CheckCircle className="h-3 w-3" />
              ) : integration.status === 'error' ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-gray-400" />
              )}
              {integration.status}
            </Badge>

            {integration.lastTested && (
              <span className="text-xs text-muted-foreground">
                {new Date(integration.lastTested).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">
              {integration.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={integration.isEnabled}
              onCheckedChange={(val) => handleToggle(integration.service, val)}
              disabled={saving}
            />
          </div>

          {/* Configure Button */}
          <Button 
            variant="outline" 
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            onClick={() => openConfigModal(integration)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredIntegrations.length} of {Object.keys(integrations).length} integrations
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Plug className="h-3 w-3 mr-1" />
          Plugin System
        </Badge>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg border">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Integration Cards Grid */}
      {filteredIntegrations.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map(renderIntegrationCard)}
        </div>
      ) : (
        <Card className="col-span-full">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Plug className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No integrations found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}

      {/* Configuration Modal */}
      {selectedIntegration && (
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {selectedIntegration.displayName}
              </DialogTitle>
              <DialogDescription>
                {selectedIntegration.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="modal-api-key">API Key *</Label>
                <Input
                  id="modal-api-key"
                  type="text"
                  value={selectedIntegration.apiKey || ''}
                  onChange={(e) => updateIntegration(selectedIntegration.service, { apiKey: e.target.value })}
                  placeholder="Enter API key"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key will be encrypted before storage
                </p>
              </div>

              {/* Form ID (for KYC providers) */}
              {selectedIntegration.category === 'KYC' && (
                <div className="space-y-2">
                  <Label htmlFor="modal-form-id">Form ID *</Label>
                  <Input
                    id="modal-form-id"
                    value={(selectedIntegration.config as any)?.formId || ''}
                    onChange={(e) => updateIntegration(selectedIntegration.service, { 
                      config: { ...selectedIntegration.config, formId: e.target.value }
                    })}
                    placeholder="form_basic_liveness"
                  />
                  <p className="text-xs text-muted-foreground">
                    KYC form ID with liveness check enabled
                  </p>
                </div>
              )}

              {/* Webhook URL (for KYC providers) - Read-only info */}
              {selectedIntegration.category === 'KYC' && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/kyc/webhook?provider=${selectedIntegration.service}`}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const webhookUrl = `${window.location.origin}/api/kyc/webhook?provider=${selectedIntegration.service}`;
                        navigator.clipboard.writeText(webhookUrl);
                        toast.success('Webhook URL copied to clipboard');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure this URL in your {selectedIntegration.displayName} dashboard to receive verification updates
                  </p>
                </div>
              )}

              {/* Webhook Secret (for KYC providers) */}
              {selectedIntegration.category === 'KYC' && (
                <div className="space-y-2">
                  <Label htmlFor="modal-webhook-secret">Webhook Secret (optional)</Label>
                  <Input
                    id="modal-webhook-secret"
                    type="password"
                    value={(selectedIntegration.config as any)?.webhookSecret || ''}
                    onChange={(e) => updateIntegration(selectedIntegration.service, { 
                      config: { ...selectedIntegration.config, webhookSecret: e.target.value }
                    })}
                    placeholder="Enter webhook secret"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to verify webhook signatures from provider
                  </p>
                </div>
              )}

              {/* API Endpoint */}
              <div className="space-y-2">
                <Label htmlFor="modal-api-endpoint">API Endpoint (optional)</Label>
                <Input
                  id="modal-api-endpoint"
                  value={selectedIntegration.apiEndpoint || ''}
                  onChange={(e) => updateIntegration(selectedIntegration.service, { apiEndpoint: e.target.value })}
                  placeholder="https://api.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use default endpoint
                </p>
              </div>

              {/* Status Display */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedIntegration.status === 'active' ? 'default' : 'secondary'}>
                    {selectedIntegration.status}
                  </Badge>
                  {selectedIntegration.lastTested && (
                    <span className="text-sm text-muted-foreground">
                      Tested {new Date(selectedIntegration.lastTested).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(selectedIntegration.service)}
                  disabled={testing === selectedIntegration.service}
                >
                  {testing === selectedIntegration.service ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeConfigModal}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  handleSave(selectedIntegration.service);
                  closeConfigModal();
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
