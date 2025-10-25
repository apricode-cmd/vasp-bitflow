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
    rateLimit: 100
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);

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

  const createApiKey = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyData.name,
          permissions: {
            rates: ['read'],
            currencies: ['read'],
            orders: ['read', 'create']
          },
          rateLimit: newKeyData.rateLimit
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedKey(data.data.key);
        toast.success('API key generated! Save it securely - it won\'t be shown again');
        await fetchApiKeys();
      } else {
        toast.error(data.error || 'Failed to generate API key');
      }
    } catch (error) {
      toast.error('Failed to generate API key');
    }
  };

  const revokeKey = async (id: string): Promise<void> => {
    setKeyToRevoke(id);
    setDeleteDialogOpen(true);
  };

  const confirmRevoke = async (): Promise<void> => {
    if (!keyToRevoke) return;

    try {
      const response = await fetch(`/api/admin/api-keys/${keyToRevoke}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('API key revoked successfully');
        await fetchApiKeys();
      } else {
        toast.error('Failed to revoke API key');
      }
    } catch (error) {
      toast.error('Failed to revoke API key');
    } finally {
      setKeyToRevoke(null);
      setDeleteDialogOpen(false);
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
          <p className="text-muted-foreground">Manage API keys for external access</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate New Key
        </Button>
      </div>

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
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                placeholder="Production Integration"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rate Limit (requests/hour)</label>
              <Input
                type="number"
                value={newKeyData.rateLimit}
                onChange={(e) => setNewKeyData({ ...newKeyData, rateLimit: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createApiKey}>Generate Key</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
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
        onConfirm={confirmRevoke}
        title="Are you sure you want to revoke this API key?"
        description="This action cannot be undone. The API key will be permanently revoked and any applications using it will lose access immediately."
        confirmText="Revoke"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

