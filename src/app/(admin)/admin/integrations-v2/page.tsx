/**
 * Integrations Management Page V2
 * 
 * Modular integration management with categories
 * Like WordPress plugins page
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Shield, Mail, TrendingUp, CreditCard, Loader2, 
  CheckCircle, XCircle, RefreshCw, ExternalLink, 
  Key as KeyIcon, Settings, Plug
} from 'lucide-react';

// Integration categories with icons
const CATEGORY_CONFIG = {
  KYC: {
    label: 'KYC & Verification',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  RATES: {
    label: 'Exchange Rates',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  EMAIL: {
    label: 'Email & Notifications',
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  PAYMENT: {
    label: 'Payment Gateways',
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

export default function IntegrationsPageV2(): JSX.Element {
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('KYC');

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
    const CategoryIcon = CATEGORY_CONFIG[integration.category as keyof typeof CATEGORY_CONFIG]?.icon || Plug;
    
    return (
      <Card key={integration.service} className="relative overflow-hidden">
        {/* Status indicator */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          integration.status === 'active' ? 'bg-green-500' :
          integration.status === 'error' ? 'bg-red-500' :
          'bg-gray-300'
        }`} />

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CategoryIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{integration.displayName}</CardTitle>
                  {integration.icon && <span className="text-2xl">{integration.icon}</span>}
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={integration.status === 'active' ? 'success' : 'secondary'}>
                {integration.status}
              </Badge>
              <Switch
                checked={integration.isEnabled}
                onCheckedChange={(val) => updateIntegration(integration.service, { isEnabled: val })}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${integration.service}-key`}>API Key</Label>
              <Input
                id={`${integration.service}-key`}
                type="password"
                value={integration.apiKey || ''}
                onChange={(e) => updateIntegration(integration.service, { apiKey: e.target.value })}
                placeholder="Enter API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${integration.service}-endpoint`}>API Endpoint</Label>
              <Input
                id={`${integration.service}-endpoint`}
                value={integration.apiEndpoint || ''}
                onChange={(e) => updateIntegration(integration.service, { apiEndpoint: e.target.value })}
                placeholder="https://api.example.com"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            {integration.lastTested && (
              <span className="text-sm text-muted-foreground">
                Last tested: {new Date(integration.lastTested).toLocaleString()}
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => testConnection(integration.service)}
                disabled={testing === integration.service}
              >
                {testing === integration.service ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test
                  </>
                )}
              </Button>
              <Button onClick={() => handleSave(integration.service)} disabled={saving}>
                <Settings className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
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
          Add new providers without touching existing code.
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
                {config.label}
                <Badge variant="secondary" className="ml-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <div className={`p-4 rounded-lg ${config.bgColor}`}>
              <h3 className={`text-lg font-semibold ${config.color} flex items-center gap-2`}>
                <config.icon className="h-5 w-5" />
                {config.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure providers for this category. Only one provider per category can be active.
              </p>
            </div>

            <div className="space-y-4">
              {integrationsByCategory[key]?.length > 0 ? (
                integrationsByCategory[key].map(renderIntegrationCard)
              ) : (
                <Card>
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
    </div>
  );
}

