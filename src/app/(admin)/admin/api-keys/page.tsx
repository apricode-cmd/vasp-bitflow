/**
 * API Keys Management Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Copy, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StepUpMfaDialog } from '@/components/admin/StepUpMfaDialog';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: Record<string, string[]>;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  rateLimit: number;
  createdAt: string;
}

export default function ApiKeysPage(): JSX.Element {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    rateLimit: 100,
    permissions: {
      rates: ['read', 'calculate'],
      currencies: ['read'],
      orders: ['read', 'create', 'cancel'],
      customers: ['read', 'create'],
      kyc: ['read', 'initiate'],
      payment_methods: ['read']
    }
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  
  // Step-up MFA state
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaPendingAction, setMfaPendingAction] = useState<'revoke' | 'create' | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/api-keys');
      const data = await response.json();

      if (data.success) {
        setApiKeys(data.data);
      }
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (mfaChallengeId?: string, mfaResponse?: AuthenticationResponseJSON): Promise<void> => {
    try {
      // Validate name
      if (!newKeyData.name || newKeyData.name.trim().length < 3) {
        toast.error('Name is required (minimum 3 characters)');
        return;
      }

      const body: any = {
        name: newKeyData.name.trim(),
        permissions: newKeyData.permissions,
        rateLimit: newKeyData.rateLimit
      };

      // If MFA data provided, include it
      if (mfaChallengeId && mfaResponse) {
        body.mfaChallengeId = mfaChallengeId;
        body.mfaResponse = mfaResponse;
      }

      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      // Check if MFA is required
      if (data.requiresMfa && !mfaChallengeId) {
        // Open MFA dialog
        setMfaPendingAction('create');
        setMfaDialogOpen(true);
        return;
      }

      if (data.success) {
        setGeneratedKey(data.data.key);
        toast.success('API key generated! Save it securely - it won\'t be shown again');
        setShowCreateForm(false);
        setNewKeyData({ 
          name: '', 
          rateLimit: 100,
          permissions: {
            rates: ['read', 'calculate'],
            currencies: ['read'],
            orders: ['read', 'create', 'cancel'],
            customers: ['read', 'create'],
            kyc: ['read', 'initiate'],
            payment_methods: ['read']
          }
        }); // Reset form
        setMfaDialogOpen(false); // Close MFA dialog if open
        await fetchApiKeys();
      } else {
        // Show detailed error
        if (data.details) {
          if (Array.isArray(data.details)) {
            const errorMsg = data.details.map((e: any) => e.message || e).join(', ');
            toast.error(`Validation error: ${errorMsg}`);
          } else {
            toast.error(`Error: ${data.details}`);
          }
        } else {
          toast.error(data.error || 'Failed to generate API key');
        }
        console.error('API error details:', data);
      }
    } catch (error) {
      console.error('Create API key error:', error);
      toast.error('Failed to generate API key');
    }
  };

  const revokeKey = async (id: string): Promise<void> => {
    setKeyToRevoke(id);
    setDeleteDialogOpen(true);
  };

  const confirmRevoke = async (mfaChallengeId?: string, mfaResponse?: AuthenticationResponseJSON): Promise<void> => {
    if (!keyToRevoke) return;

    try {
      const body: any = {};
      
      // If MFA data provided, include it
      if (mfaChallengeId && mfaResponse) {
        body.mfaChallengeId = mfaChallengeId;
        body.mfaResponse = mfaResponse;
      }

      const response = await fetch(`/api/admin/api-keys/${keyToRevoke}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Check if MFA is required
      if (data.requiresMfa && !mfaChallengeId) {
        // Open MFA dialog
        setMfaPendingAction('revoke');
        setMfaDialogOpen(true);
        setDeleteDialogOpen(false);
        return;
      }

      if (response.ok && data.success) {
        toast.success('API key revoked successfully');
        await fetchApiKeys();
        setKeyToRevoke(null);
        setDeleteDialogOpen(false);
        setMfaDialogOpen(false);
      } else {
        toast.error(data.error || 'Failed to revoke API key');
      }
    } catch (error) {
      console.error('Revoke error:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const handleMfaSuccess = (challengeId: string, response: AuthenticationResponseJSON) => {
    // Retry the action with MFA data
    if (mfaPendingAction === 'revoke') {
      confirmRevoke(challengeId, response);
    } else if (mfaPendingAction === 'create') {
      createApiKey(challengeId, response);
    }
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for REST API integrations · Keys are encrypted with AES-256-GCM
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">Secure API Key Storage</p>
              <p>All API keys are encrypted using AES-256-GCM before storage. Keys are only shown once during generation.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Key Display */}
      {generatedKey && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600">API Key Generated!</CardTitle>
            <CardDescription>Save this key securely - it will not be shown again</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              <code className="flex-1">{generatedKey}</code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedKey)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => setGeneratedKey(null)} className="mt-4">
              I've saved it
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && !generatedKey && (
        <Card>
          <CardHeader>
            <CardTitle>Generate New API Key</CardTitle>
            <CardDescription>
              Create a new API key for REST API integration. The key will be encrypted with AES-256-GCM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                placeholder="Production Integration"
                required
                minLength={3}
                maxLength={100}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 3 characters. Used to identify the API key (e.g., "Production Bot", "Test Integration")
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Rate Limit (requests/hour)</label>
              <Input
                type="number"
                value={newKeyData.rateLimit}
                onChange={(e) => setNewKeyData({ ...newKeyData, rateLimit: parseInt(e.target.value) || 100 })}
                min={1}
                max={10000}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: 100 requests/hour. Adjust based on expected usage.
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Default Permissions (Public API v1):</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✅ <strong>Rates:</strong> read, calculate</li>
                <li>✅ <strong>Currencies:</strong> read</li>
                <li>✅ <strong>Orders:</strong> read, create, cancel</li>
                <li>✅ <strong>Customers:</strong> read, create</li>
                <li>✅ <strong>KYC:</strong> read, initiate</li>
                <li>✅ <strong>Payment Methods:</strong> read</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Covers all 13 Public API v1 endpoints
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => createApiKey()}
                disabled={!newKeyData.name || newKeyData.name.trim().length < 3}
              >
                Generate Key
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setNewKeyData({ 
                    name: '', 
                    rateLimit: 100,
                    permissions: {
                      rates: ['read', 'calculate'],
                      currencies: ['read'],
                      orders: ['read', 'create', 'cancel'],
                      customers: ['read', 'create'],
                      kyc: ['read', 'initiate'],
                      payment_methods: ['read']
                    }
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading API keys...
          </CardContent>
        </Card>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No API keys generated yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4" />
                      <h3 className="font-semibold">{key.name}</h3>
                      <Badge variant={key.isActive ? 'default' : 'secondary'}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Prefix</div>
                        <code className="font-mono">{key.prefix}...</code>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rate Limit</div>
                        <div>{key.rateLimit}/hour</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Usage</div>
                        <div>{key.usageCount} requests</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Used</div>
                        <div>{key.lastUsedAt ? format(new Date(key.lastUsedAt), 'MMM dd, HH:mm') : 'Never'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key.prefix)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {key.isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => confirmRevoke()}
        title="Are you sure you want to revoke this API key?"
        description="This action cannot be undone. The API key will be permanently revoked and any applications using it will lose access immediately."
        confirmText="Revoke"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Step-up MFA Dialog */}
      <StepUpMfaDialog
        open={mfaDialogOpen}
        onOpenChange={setMfaDialogOpen}
        action={mfaPendingAction === 'create' ? 'GENERATE_API_KEY' : 'REVOKE_API_KEY'}
        actionDescription={
          mfaPendingAction === 'create'
            ? 'Generating an API key requires additional verification for security.'
            : 'Revoking an API key requires additional verification for security.'
        }
        onSuccess={handleMfaSuccess}
        onCancel={() => {
          setMfaDialogOpen(false);
          setMfaPendingAction(null);
          setKeyToRevoke(null);
        }}
      />
    </div>
  );
}

