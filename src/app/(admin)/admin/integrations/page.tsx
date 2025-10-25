/**
 * Integrations Management Page
 * 
 * Configure external service integrations: CoinGecko, KYCAID, Email
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  TrendingUp, Shield, Mail, Save, Loader2, 
  CheckCircle, XCircle, RefreshCw, ExternalLink, Key as KeyIcon
} from 'lucide-react';

interface Integration {
  service: string;
  isEnabled: boolean;
  status: 'active' | 'inactive' | 'error';
  apiKey?: string;
  apiEndpoint?: string;
  lastTested?: Date | null;
  config?: Record<string, any>;
  rates?: {
    BTC: { EUR: number; PLN: number };
    ETH: { EUR: number; PLN: number };
    USDT: { EUR: number; PLN: number };
    SOL: { EUR: number; PLN: number };
  };
}

export default function IntegrationsPage(): JSX.Element {
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/admin/integrations');
      const data = await response.json();
      
      if (data.success && data.integrations && Array.isArray(data.integrations)) {
        const integrationsMap: Record<string, Integration> = {};
        data.integrations.forEach((int: Integration) => {
          integrationsMap[int.service] = {
            ...int,
            lastTested: int.lastTested ? new Date(int.lastTested) : null
          };
        });
        setIntegrations(integrationsMap);
      } else {
        // Initialize with default empty integrations
        setIntegrations({
          coingecko: { 
            service: 'coingecko', 
            isEnabled: false, 
            status: 'inactive',
            apiEndpoint: 'https://api.coingecko.com/api/v3'
          },
          kycaid: { 
            service: 'kycaid', 
            isEnabled: false, 
            status: 'inactive',
            apiEndpoint: 'https://api.kycaid.com'
          },
          resend: { 
            service: 'resend', 
            isEnabled: false, 
            status: 'inactive'
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Failed to load integrations');
      // Set defaults on error
      setIntegrations({
        coingecko: { service: 'coingecko', isEnabled: false, status: 'inactive', apiEndpoint: 'https://api.coingecko.com/api/v3' },
        kycaid: { service: 'kycaid', isEnabled: false, status: 'inactive', apiEndpoint: 'https://api.kycaid.com' },
        resend: { service: 'resend', isEnabled: false, status: 'inactive' }
      });
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
        toast.success(`${service} integration saved successfully`);
        // Update local state with saved data
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
      let response;
      
      if (service === 'coingecko') {
        response = await fetch('/api/admin/integrations/coingecko/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        response = await fetch(`/api/admin/integrations/${service}/test`, {
          method: 'POST'
        });
      }

      const data = await response.json();

      if (data.success) {
        if (service === 'coingecko' && data.data?.rates) {
          toast.success('CoinGecko API connection successful!', {
            description: `Rates updated: ${new Date().toLocaleString()}`
          });
          updateIntegration(service, { 
            status: 'active', 
            lastTested: new Date(),
            rates: data.data.rates
          });
          // Save to database
          await handleSave(service);
        } else {
          toast.success(`${service} connection successful`);
          updateIntegration(service, { status: 'active', lastTested: new Date() });
          // Save to database
          await handleSave(service);
        }
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

  const coingecko = integrations['coingecko'] || { service: 'coingecko', isEnabled: false, status: 'inactive' };
  const kycaid = integrations['kycaid'] || { service: 'kycaid', isEnabled: false, status: 'inactive' };
  const resend = integrations['resend'] || { service: 'resend', isEnabled: false, status: 'inactive' };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Configure external service integrations and API connections
        </p>
      </div>

      {/* CoinGecko Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                CoinGecko API
                <Badge variant={coingecko.status === 'active' ? 'success' : 'secondary'}>
                  {coingecko.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Real-time cryptocurrency price data provider
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={coingecko.isEnabled}
                onCheckedChange={(val) => updateIntegration('coingecko', { isEnabled: val })}
              />
              <span className="text-sm text-muted-foreground">
                {coingecko.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="coingecko-key">API Key (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="coingecko-key"
                  type="password"
                  value={coingecko.apiKey || ''}
                  onChange={(e) => updateIntegration('coingecko', { apiKey: e.target.value })}
                  placeholder="CG-xxxxxxxxxxxx"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open('https://www.coingecko.com/en/api/pricing', '_blank')}
                  title="Get API Key"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Free tier: 10-50 calls/min. Pro tier for higher limits.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coingecko-endpoint">API Endpoint</Label>
              <Input
                id="coingecko-endpoint"
                value={coingecko.apiEndpoint || 'https://api.coingecko.com/api/v3'}
                onChange={(e) => updateIntegration('coingecko', { apiEndpoint: e.target.value })}
                placeholder="https://api.coingecko.com/api/v3"
              />
            </div>
          </div>

          {/* Current Rates Display */}
          {coingecko.status === 'active' && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Current Exchange Rates
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium text-green-600">BTC</div>
                  <div>EUR: €{coingecko.rates?.BTC?.EUR?.toFixed(2) || 'N/A'}</div>
                  <div>PLN: {coingecko.rates?.BTC?.PLN?.toFixed(2) || 'N/A'} zł</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-blue-600">ETH</div>
                  <div>EUR: €{coingecko.rates?.ETH?.EUR?.toFixed(2) || 'N/A'}</div>
                  <div>PLN: {coingecko.rates?.ETH?.PLN?.toFixed(2) || 'N/A'} zł</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-orange-600">USDT</div>
                  <div>EUR: €{coingecko.rates?.USDT?.EUR?.toFixed(4) || 'N/A'}</div>
                  <div>PLN: {coingecko.rates?.USDT?.PLN?.toFixed(4) || 'N/A'} zł</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-purple-600">SOL</div>
                  <div>EUR: €{coingecko.rates?.SOL?.EUR?.toFixed(2) || 'N/A'}</div>
                  <div>PLN: {coingecko.rates?.SOL?.PLN?.toFixed(2) || 'N/A'} zł</div>
                </div>
              </div>
              {coingecko.lastTested && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date(coingecko.lastTested).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            {coingecko.lastTested && (
              <span className="text-sm text-muted-foreground">
                Last tested: {new Date(coingecko.lastTested).toLocaleString()}
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => testConnection('coingecko')}
                disabled={testing === 'coingecko'}
              >
                {testing === 'coingecko' ? (
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
              <Button onClick={() => handleSave('coingecko')} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYCAID Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                KYCAID
                <Badge variant={kycaid.status === 'active' ? 'success' : 'secondary'}>
                  {kycaid.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Identity verification and KYC compliance provider
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={kycaid.isEnabled}
                onCheckedChange={(val) => updateIntegration('kycaid', { isEnabled: val })}
              />
              <span className="text-sm text-muted-foreground">
                {kycaid.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <KeyIcon className="h-4 w-4" />
            <AlertTitle>API Credentials</AlertTitle>
            <AlertDescription>
              Get your API keys from KYCAID dashboard. Keep these credentials secure.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="kycaid-key">API Key</Label>
              <Input
                id="kycaid-key"
                type="password"
                value={kycaid.apiKey || ''}
                onChange={(e) => updateIntegration('kycaid', { apiKey: e.target.value })}
                placeholder="kycaid_api_key_..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kycaid-form">Form ID</Label>
              <Input
                id="kycaid-form"
                value={kycaid.config?.formId || ''}
                onChange={(e) => updateIntegration('kycaid', { 
                  config: { ...kycaid.config, formId: e.target.value } 
                })}
                placeholder="form_..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kycaid-webhook">Webhook Secret</Label>
              <Input
                id="kycaid-webhook"
                type="password"
                value={kycaid.config?.webhookSecret || ''}
                onChange={(e) => updateIntegration('kycaid', { 
                  config: { ...kycaid.config, webhookSecret: e.target.value } 
                })}
                placeholder="whsec_..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kycaid-endpoint">API Endpoint</Label>
              <Input
                id="kycaid-endpoint"
                value={kycaid.apiEndpoint || 'https://api.kycaid.com'}
                onChange={(e) => updateIntegration('kycaid', { apiEndpoint: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://kycaid.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open KYCAID Dashboard
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => testConnection('kycaid')}
                disabled={testing === 'kycaid'}
              >
                {testing === 'kycaid' ? (
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
              <Button onClick={() => handleSave('kycaid')} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resend Email Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Resend (Email Service)
                <Badge variant={resend.status === 'active' ? 'success' : 'secondary'}>
                  {resend.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Transactional email delivery service
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={resend.isEnabled !== false}
                onCheckedChange={(val) => updateIntegration('resend', { isEnabled: val })}
              />
              <span className="text-sm text-muted-foreground">
                {resend.isEnabled !== false ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="resend-key">API Key</Label>
              <Input
                id="resend-key"
                type="password"
                value={resend.apiKey || ''}
                onChange={(e) => updateIntegration('resend', { apiKey: e.target.value })}
                placeholder="re_..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-from">From Email</Label>
              <Input
                id="resend-from"
                type="email"
                value={resend.config?.fromEmail || ''}
                onChange={(e) => updateIntegration('resend', { 
                  config: { ...resend.config, fromEmail: e.target.value } 
                })}
                placeholder="noreply@apricode.io"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => testConnection('resend')}
              disabled={testing === 'resend'}
            >
              {testing === 'resend' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
            <Button onClick={() => handleSave('resend')} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
