'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Save, Maximize2 } from 'lucide-react';
import { type Node, type Edge } from '@xyflow/react';

// Import form renderers from PropertiesPanel
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ExpressionInput from './ExpressionInput';
import KeyValuePairBuilder, { type KeyValuePair } from '@/components/workflows/KeyValuePairBuilder';
import { HTTP_REQUEST_TEMPLATES, type HttpRequestTemplate } from '@/lib/validations/http-request';
import HttpRequestTester from './HttpRequestTester';

interface NodePropertiesModalProps {
  open: boolean;
  selectedNode: Node | null;
  allNodes: Node[];
  allEdges: Edge[];
  onClose: () => void;
  onSave: (nodeId: string, data: any) => void;
}

export default function NodePropertiesModal({
  open,
  selectedNode,
  allNodes,
  allEdges,
  onClose,
  onSave,
}: NodePropertiesModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data || {});
      setHasChanges(false);
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (selectedNode) {
      onSave(selectedNode.id, formData);
      setHasChanges(false);
      onClose();
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      config: { ...(prev.config || {}), [field]: value },
    }));
    setHasChanges(true);
  };

  if (!selectedNode) return null;

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trigger: 'Trigger',
      condition: 'Condition',
      action: 'Action',
      httpRequest: 'HTTP Request',
    };
    return labels[type] || type;
  };

  // Get available variables
  const availableVariables = allEdges
    .filter(edge => edge.target === selectedNode.id)
    .map(edge => edge.source)
    .map(sourceId => allNodes.find(n => n.id === sourceId))
    .filter(Boolean)
    .flatMap(node => [
      { name: `${node!.id}.result`, path: `$node.${node!.id}.result`, type: 'any' },
    ]);

  availableVariables.push({ name: 'env.API_KEY', path: '$env.API_KEY', type: 'string' });

  // Render HTTP Request Form
  const renderHttpRequestForm = () => {
    const config = formData.config || {};
    const method = config.method || 'GET';
    const url = config.url || '';
    const queryParams = (config.queryParams as KeyValuePair[]) || [];
    const headers = (config.headers as KeyValuePair[]) || [];
    const bodyType = config.bodyType || 'NONE';
    const body = config.body || '';
    const authType = config.auth?.type || 'NONE';
    const timeout = config.timeout || 30000;
    const followRedirects = config.followRedirects !== false;
    const validateSSL = config.validateSSL !== false;

    const handleLoadTemplate = (templateKey: string) => {
      const template = HTTP_REQUEST_TEMPLATES[templateKey as HttpRequestTemplate];
      if (template) {
        const { name, ...templateConfig } = template;
        setFormData((prev: any) => ({
          ...prev,
          config: {
            ...prev.config,
            ...templateConfig,
            queryParams: templateConfig.queryParams || [],
            headers: templateConfig.headers || [],
          },
        }));
        setHasChanges(true);
      }
    };

    return (
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Templates */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Quick Start</Label>
            <Select onValueChange={handleLoadTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Load template..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HTTP_REQUEST_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Request */}
          <div>
            <Label className="text-lg font-bold mb-4 block">Request</Label>
            <div className="space-y-4">
              <div className="grid grid-cols-[140px,1fr] gap-3">
                <div>
                  <Label className="text-sm mb-2 block">Method</Label>
                  <Select value={method} onValueChange={(v) => handleConfigChange('method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                        <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">URL</Label>
                  <ExpressionInput
                    value={url}
                    onChange={(v) => handleConfigChange('url', v)}
                    placeholder="https://api.example.com/endpoint"
                    availableVariables={availableVariables}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Query Parameters</Label>
                <KeyValuePairBuilder
                  items={queryParams}
                  onChange={(items) => handleConfigChange('queryParams', items)}
                  placeholder={{ key: 'param', value: 'value' }}
                  expressionSupport={true}
                  availableVariables={availableVariables}
                  keyLabel="Parameter"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Headers</Label>
                <KeyValuePairBuilder
                  items={headers}
                  onChange={(items) => handleConfigChange('headers', items)}
                  placeholder={{ key: 'Header-Name', value: 'value' }}
                  expressionSupport={true}
                  availableVariables={availableVariables}
                  keyLabel="Header"
                />
              </div>
            </div>
          </div>

          {/* Body */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <>
              <Separator />
              <div>
                <Label className="text-lg font-bold mb-4 block">Body</Label>
                <div className="space-y-4">
                  <Select value={bodyType} onValueChange={(v) => handleConfigChange('bodyType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="FORM">Form URL Encoded</SelectItem>
                      <SelectItem value="RAW">Raw</SelectItem>
                    </SelectContent>
                  </Select>
                  {bodyType !== 'NONE' && (
                    <ExpressionInput
                      value={body}
                      onChange={(v) => handleConfigChange('body', v)}
                      placeholder={bodyType === 'JSON' ? '{\n  "key": "{{ $node.value }}"\n}' : 'Body content'}
                      availableVariables={availableVariables}
                      rows={12}
                      isJson={bodyType === 'JSON'}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Authentication */}
          <div>
            <Label className="text-lg font-bold mb-4 block">Authentication</Label>
            <div className="space-y-4">
              <Select value={authType} onValueChange={(v) => handleConfigChange('auth', { type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                  <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
                  <SelectItem value="API_KEY">API Key</SelectItem>
                  <SelectItem value="OAUTH2">OAuth2</SelectItem>
                </SelectContent>
              </Select>

              {authType === 'BEARER_TOKEN' && (
                <div>
                  <Label className="text-sm mb-2 block">Token</Label>
                  <ExpressionInput
                    value={config.auth?.token || ''}
                    onChange={(v) => handleConfigChange('auth', { ...config.auth, type: authType, token: v })}
                    placeholder="{{ $env.API_TOKEN }}"
                    availableVariables={availableVariables}
                  />
                </div>
              )}

              {authType === 'BASIC_AUTH' && (
                <>
                  <div>
                    <Label className="text-sm mb-2 block">Username</Label>
                    <ExpressionInput
                      value={config.auth?.username || ''}
                      onChange={(v) => handleConfigChange('auth', { ...config.auth, type: authType, username: v })}
                      placeholder="{{ $env.API_USERNAME }}"
                      availableVariables={availableVariables}
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Password</Label>
                    <ExpressionInput
                      value={config.auth?.password || ''}
                      onChange={(v) => handleConfigChange('auth', { ...config.auth, type: authType, password: v })}
                      placeholder="{{ $env.API_PASSWORD }}"
                      availableVariables={availableVariables}
                      type="password"
                    />
                  </div>
                </>
              )}

              {authType === 'API_KEY' && (
                <>
                  <div>
                    <Label className="text-sm mb-2 block">Location</Label>
                    <Select
                      value={config.auth?.apiKeyLocation || 'HEADER'}
                      onValueChange={(v) => handleConfigChange('auth', { ...config.auth, type: authType, apiKeyLocation: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HEADER">Header</SelectItem>
                        <SelectItem value="QUERY">Query Parameter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Key Name</Label>
                    <Input
                      value={config.auth?.apiKeyName || ''}
                      onChange={(e) => handleConfigChange('auth', { ...config.auth, type: authType, apiKeyName: e.target.value })}
                      placeholder="X-API-Key"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Key Value</Label>
                    <ExpressionInput
                      value={config.auth?.apiKeyValue || ''}
                      onChange={(v) => handleConfigChange('auth', { ...config.auth, type: authType, apiKeyValue: v })}
                      placeholder="{{ $env.API_KEY }}"
                      availableVariables={availableVariables}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Response */}
          <div>
            <Label className="text-lg font-bold mb-4 block">Response</Label>
            <div className="space-y-4">
              <Select value={config.responseFormat || 'JSON'} onValueChange={(v) => handleConfigChange('responseFormat', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="BINARY">Binary</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="fullResponse" checked={config.fullResponse === true} onChange={(e) => handleConfigChange('fullResponse', e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="fullResponse" className="text-sm cursor-pointer">Full Response (headers + status)</Label>
              </div>

              {!config.fullResponse && (
                <div>
                  <Label className="text-sm mb-2 block">Extract Path (JSONPath)</Label>
                  <Input value={config.extractPath || ''} onChange={(e) => handleConfigChange('extractPath', e.target.value)} placeholder="data.results" className="font-mono" />
                </div>
              )}

              <div>
                <Label className="text-sm mb-2 block">Success Status Codes</Label>
                <Input
                  value={(config.successStatusCodes || [200, 201, 204]).join(', ')}
                  onChange={(e) => handleConfigChange('successStatusCodes', e.target.value.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c)))}
                  placeholder="200, 201, 204"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div>
            <Label className="text-lg font-bold mb-4 block">Options</Label>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Timeout (ms)</Label>
                <Input type="number" value={timeout} onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="retry" checked={config.retryOnFailure === true} onChange={(e) => handleConfigChange('retryOnFailure', e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="retry" className="text-sm cursor-pointer">Retry on Failure</Label>
              </div>

              {config.retryOnFailure && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-2 block">Attempts</Label>
                    <Input type="number" min="1" max="5" value={config.retryAttempts || 3} onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Delay (ms)</Label>
                    <Input type="number" value={config.retryDelay || 1000} onChange={(e) => handleConfigChange('retryDelay', parseInt(e.target.value))} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="redirects" checked={followRedirects} onChange={(e) => handleConfigChange('followRedirects', e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="redirects" className="text-sm cursor-pointer">Follow Redirects</Label>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="ssl" checked={validateSSL} onChange={(e) => handleConfigChange('validateSSL', e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="ssl" className="text-sm cursor-pointer">Validate SSL</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Test */}
          <HttpRequestTester config={formData.config || {}} />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-[95vw] w-[1600px] max-h-[95vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-8 py-5 border-b bg-muted/30 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Maximize2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <DialogTitle className="text-xl font-bold">{getNodeTypeLabel(selectedNode.type)}</DialogTitle>
                <Badge variant="outline" className="mt-1">{selectedNode.type}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && <Badge variant="secondary">Unsaved</Badge>}
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-140px)] px-8 py-6">
          {selectedNode.type === 'httpRequest' && renderHttpRequestForm()}
          {selectedNode.type !== 'httpRequest' && (
            <div className="text-center py-12 text-muted-foreground">
              Form for {selectedNode.type} node (coming soon)
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-background rounded border text-xs">Esc</kbd> to close
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={!hasChanges}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

