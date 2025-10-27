/**
 * Integrations Management Page
 * 
 * Modern card-based UI with modal configuration
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Shield, Mail, TrendingUp, CreditCard, Loader2, 
  CheckCircle, XCircle, RefreshCw, ExternalLink, 
  Key as KeyIcon, Settings, Plug, Check, X
} from 'lucide-react';

// Integration categories with icons
const CATEGORY_CONFIG = {
  KYC: {
    label: 'KYC & Verification',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  RATES: {
    label: 'Exchange Rates',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  EMAIL: {
    label: 'Email & Notifications',
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  PAYMENT: {
    label: 'Payment Gateways',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
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
  const [activeCategory, setActiveCategory] = useState('KYC');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

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
    
    // Update selected integration if it's open
    if (selectedIntegration?.service === service) {
      setSelectedIntegration(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleToggle = async (service: string, enabled: boolean) => {
    updateIntegration(service, { isEnabled: enabled });
    await handleSave(service);
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
        toast.success(`${integrations[service].displayName} saved successfully`);
        updateIntegration(service, data.integration);
      } else {
        toast.error(data.error || 'Failed to save integration');
      }
    } catch (error: any) {
      console.error('Save error:', error);
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
        toast.success(`${integrations[service].displayName} connection successful!`);
        updateIntegration(service, { 
          status: 'active', 
          lastTested: new Date()
        });
        await handleSave(service);
      } else {
        toast.error(data.message || data.error || 'Connection failed');
        updateIntegration(service, { status: 'error' });
      }
    } catch (error: any) {
      console.error(`${service} test error:`, error);
      toast.error(`Test failed: ${error.message}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group integrations by category
  const integrationsByCategory = Object.values(integrations).reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  const renderIntegrationCard = (integration: Integration) => {
    const categoryConfig = CATEGORY_CONFIG[integration.category as keyof typeof CATEGORY_CONFIG];
    const CategoryIcon = categoryConfig?.icon || Plug;
    
    return (
      <Card 
        key={integration.service} 
        className={`group hover:shadow-lg transition-all duration-200 border-2 ${
          integration.status === 'active' ? categoryConfig?.borderColor : 'border-gray-200'
        }`}
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
                <CardDescription className="text-xs mt-1">
                  {integration.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Badge */}
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
              {integration.status === 'active' ? 'Active' : 
               integration.status === 'error' ? 'Error' : 'Inactive'}
            </Badge>

            {/* Last Tested */}
            {integration.lastTested && (
              <span className="text-xs text-muted-foreground">
                Tested {new Date(integration.lastTested).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {integration.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
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
      <div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Plug className="h-4 w-4" />
          <span className="text-sm font-medium">Plugin System</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Manage external service integrations. Enable/disable providers like WordPress plugins.
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <KeyIcon className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">Modular Integration System</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Each integration is a plugin that can be enabled/disabled independently. 
          Click <strong>Configure</strong> to manage API keys and settings.
        </AlertDescription>
      </Alert>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = integrationsByCategory[key]?.length || 0;
            
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
                <Badge variant="secondary" className="ml-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            {/* Category Header */}
            <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
              <h3 className={`text-lg font-semibold ${config.color} flex items-center gap-2`}>
                <config.icon className="h-5 w-5" />
                {config.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure providers for this category. Only one provider per category can be active.
              </p>
            </div>

            {/* Integration Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationsByCategory[key]?.length > 0 ? (
                integrationsByCategory[key].map(renderIntegrationCard)
              ) : (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Plug className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No integrations available for this category yet.</p>
                    <p className="text-sm mt-2">Add new providers by registering them in the system.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Modal */}
      {selectedIntegration && (
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure {selectedIntegration.displayName}
              </DialogTitle>
              <DialogDescription>
                {selectedIntegration.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="modal-api-key">API Key</Label>
                <Input
                  id="modal-api-key"
                  type="password"
                  value={selectedIntegration.apiKey || ''}
                  onChange={(e) => updateIntegration(selectedIntegration.service, { apiKey: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>

              {/* API Endpoint */}
              <div className="space-y-2">
                <Label htmlFor="modal-api-endpoint">API Endpoint</Label>
                <Input
                  id="modal-api-endpoint"
                  value={selectedIntegration.apiEndpoint || ''}
                  onChange={(e) => updateIntegration(selectedIntegration.service, { apiEndpoint: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>

              {/* Status Display */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedIntegration.status === 'active' ? 'default' : 'secondary'}>
                    {selectedIntegration.status}
                  </Badge>
                  {selectedIntegration.lastTested && (
                    <span className="text-sm text-muted-foreground">
                      Last tested: {new Date(selectedIntegration.lastTested).toLocaleString()}
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
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Connection
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
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
