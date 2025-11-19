'use client';

/**
 * Properties Panel Component
 * 
 * Right sidebar for editing selected node configuration
 */

import { useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Save, Filter } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ExpressionInput from './ExpressionInput';
import TriggerConfigDialog from './TriggerConfigDialog';
import KeyValuePairBuilder, { type KeyValuePair } from '@/components/workflows/KeyValuePairBuilder';
import { HTTP_REQUEST_TEMPLATES, type HttpRequestTemplate } from '@/lib/validations/http-request';
import HttpRequestTester from './HttpRequestTester';
import type { Edge } from '@xyflow/react';
import type { TriggerConfig } from '@/lib/validations/trigger-config';
import { useState as useReactState } from 'react';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  allNodes?: Node[];
  allEdges?: Edge[];
}

// Field options for Condition nodes
const CONDITION_FIELDS = [
  { value: 'amount', label: 'Order Amount', type: 'number' },
  { value: 'fiatAmount', label: 'Fiat Amount', type: 'number' },
  { value: 'currency', label: 'Crypto Currency', type: 'string' },
  { value: 'fiatCurrency', label: 'Fiat Currency', type: 'string' },
  { value: 'country', label: 'User Country', type: 'string' },
  { value: 'kycStatus', label: 'KYC Status', type: 'string' },
  { value: 'userId', label: 'User ID', type: 'string' },
  { value: 'email', label: 'User Email', type: 'string' },
  { value: 'orderCount', label: 'User Order Count', type: 'number' },
  { value: 'totalVolume', label: 'User Total Volume', type: 'number' },
];

// Operators
const OPERATORS = [
  { value: '==', label: 'Equals (==)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: 'in', label: 'In Array (in)' },
  { value: 'not_in', label: 'Not In Array (not_in)' },
  { value: 'contains', label: 'Contains (string)' },
  { value: 'matches', label: 'Regex Match' },
];

// Action types with their config fields
const ACTION_TYPES = [
  {
    value: 'FREEZE_ORDER',
    label: 'Freeze Order',
    fields: [{ key: 'reason', label: 'Reason', type: 'text' }],
  },
  {
    value: 'REJECT_TRANSACTION',
    label: 'Reject Transaction',
    fields: [{ key: 'reason', label: 'Reason', type: 'text' }],
  },
  {
    value: 'REQUEST_DOCUMENT',
    label: 'Request Document',
    fields: [
      { key: 'documentType', label: 'Document Type', type: 'text' },
      { key: 'message', label: 'Message', type: 'textarea' },
    ],
  },
  {
    value: 'REQUIRE_APPROVAL',
    label: 'Require Approval',
    fields: [
      { key: 'approverRole', label: 'Approver Role', type: 'select', options: ['ADMIN', 'COMPLIANCE', 'SUPER_ADMIN'] },
      { key: 'minApprovals', label: 'Min Approvals', type: 'number' },
    ],
  },
  {
    value: 'SEND_NOTIFICATION',
    label: 'Send Notification',
    fields: [
      { key: 'recipientRole', label: 'Recipient Role', type: 'select', options: ['ADMIN', 'COMPLIANCE', 'SUPER_ADMIN'] },
      { key: 'template', label: 'Template', type: 'text' },
      { key: 'message', label: 'Message', type: 'textarea' },
    ],
  },
  {
    value: 'FLAG_FOR_REVIEW',
    label: 'Flag for Review',
    fields: [{ key: 'reason', label: 'Reason', type: 'text' }],
  },
  {
    value: 'AUTO_APPROVE',
    label: 'Auto Approve',
    fields: [],
  },
  {
    value: 'ESCALATE_TO_COMPLIANCE',
    label: 'Escalate to Compliance',
    fields: [{ key: 'reason', label: 'Reason', type: 'text' }],
  },
  {
    value: 'HTTP_REQUEST',
    label: 'HTTP Request',
    fields: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
      { key: 'url', label: 'URL', type: 'text' },
      { key: 'authType', label: 'Auth Type', type: 'select', options: ['NONE', 'BEARER_TOKEN', 'BASIC_AUTH', 'API_KEY'] },
      { key: 'authToken', label: 'Auth Token/Key', type: 'text' },
      { key: 'body', label: 'Request Body (JSON)', type: 'textarea' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
    ],
  },
];

export default function PropertiesPanel({
  selectedNode,
  onClose,
  onUpdate,
  allNodes = [],
  allEdges = [],
}: PropertiesPanelProps) {
  const [formData, setFormData] = useState<any>({});
  const [showTriggerConfig, setShowTriggerConfig] = useReactState(false);

  // Initialize form data when node is selected
  useEffect(() => {
    if (selectedNode) {
      setFormData(selectedNode.data || {});
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  // Get available variables from previous nodes (n8n-style)
  const getAvailableVariables = () => {
    if (!selectedNode) return [];

    // Find all nodes that come BEFORE the selected node
    const previousNodeIds = new Set<string>();
    const visited = new Set<string>();

    // Recursive function to find all upstream nodes
    const findUpstream = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const incomingEdges = allEdges.filter(e => e.target === nodeId);
      incomingEdges.forEach(edge => {
        previousNodeIds.add(edge.source);
        findUpstream(edge.source);
      });
    };

    findUpstream(selectedNode.id);

    // Build variable groups from previous nodes
    const variableGroups: any[] = [];

    allNodes.forEach(node => {
      if (!previousNodeIds.has(node.id)) return;

      // Define what variables each node type exposes
      let variables: any[] = [];

      if (node.type === 'trigger') {
        // Trigger exposes all context data
        variables = [
          { path: 'amount', label: 'Amount', type: 'number', example: 15000 },
          { path: 'fiatAmount', label: 'Fiat Amount', type: 'number', example: 15000 },
          { path: 'currency', label: 'Currency', type: 'string', example: 'BTC' },
          { path: 'fiatCurrency', label: 'Fiat Currency', type: 'string', example: 'EUR' },
          { path: 'userId', label: 'User ID', type: 'string', example: 'user_123' },
          { path: 'email', label: 'Email', type: 'string', example: 'user@example.com' },
          { path: 'country', label: 'Country', type: 'string', example: 'US' },
          { path: 'kycStatus', label: 'KYC Status', type: 'string', example: 'APPROVED' },
          { path: 'orderCount', label: 'Order Count', type: 'number', example: 5 },
          { path: 'totalVolume', label: 'Total Volume', type: 'number', example: 50000 },
        ];
      } else if (node.type === 'condition') {
        // Condition exposes its result
        variables = [
          { path: 'result', label: 'Condition Result', type: 'boolean', example: true },
          { path: 'field', label: 'Checked Field', type: 'string', example: node.data.field },
          { path: 'value', label: 'Comparison Value', type: 'any', example: node.data.value },
        ];
      } else if (node.type === 'action') {
        // Action exposes its result
        variables = [
          { path: 'success', label: 'Action Success', type: 'boolean', example: true },
          { path: 'actionType', label: 'Action Type', type: 'string', example: node.data.actionType },
        ];
      }

      if (variables.length > 0) {
        variableGroups.push({
          nodeId: node.id,
          nodeName: node.data.label || node.data.trigger || node.data.actionType || node.type,
          nodeType: node.type,
          variables,
        });
      }
    });

    return variableGroups;
  };

  const availableVariables = getAvailableVariables();

  const handleSave = () => {
    onUpdate(selectedNode.id, formData);
    onClose();
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleConfigChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  const handleSaveTriggerConfig = (config: TriggerConfig) => {
    handleConfigChange('triggerConfig', config);
  };

  const renderTriggerForm = () => {
    const triggerConfig: TriggerConfig = formData.config?.triggerConfig || {
      filters: [],
      logic: 'OR',
      enabled: true,
    };

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Trigger Type</Label>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {formData.trigger}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Trigger type cannot be changed after creation
          </p>
        </div>

        <Separator />

        {/* Trigger Filters Configuration */}
        <div>
          <Label className="text-xs font-semibold">Trigger Filters</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Define conditions for when this workflow should execute
          </p>

          <div className="space-y-2">
            {/* Filter Summary */}
            {triggerConfig.filters.length > 0 ? (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">
                      {triggerConfig.filters.length} active filter
                      {triggerConfig.filters.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {triggerConfig.logic}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {triggerConfig.filters.slice(0, 3).map((filter, idx) => (
                    <div key={idx} className="text-[10px] text-muted-foreground font-mono">
                      • {filter.field} {filter.operator} {String(filter.value)}
                    </div>
                  ))}
                  {triggerConfig.filters.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">
                      ... and {triggerConfig.filters.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  No filters configured - workflow will trigger for all events
                </p>
              </div>
            )}

            {/* Configure Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowTriggerConfig(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {triggerConfig.filters.length > 0 ? 'Edit' : 'Configure'} Filters
            </Button>
          </div>
        </div>

        {/* Trigger Config Dialog */}
        {formData.trigger && (
          <TriggerConfigDialog
            open={showTriggerConfig}
            onOpenChange={setShowTriggerConfig}
            trigger={formData.trigger}
            config={triggerConfig}
            onSave={handleSaveTriggerConfig}
          />
        )}
      </div>
    );
  };

  const renderConditionForm = () => {
    const selectedField = CONDITION_FIELDS.find(f => f.value === formData.field);
    
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="field" className="text-xs">Field to Check</Label>
          <Select
            value={formData.field || ''}
            onValueChange={(value) => handleFieldChange('field', value)}
          >
            <SelectTrigger id="field" className="mt-1.5">
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_FIELDS.map((field) => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="operator" className="text-xs">Operator</Label>
          <Select
            value={formData.operator || ''}
            onValueChange={(value) => handleFieldChange('operator', value)}
          >
            <SelectTrigger id="operator" className="mt-1.5">
              <SelectValue placeholder="Select operator..." />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="value" className="text-xs">Comparison Value</Label>
          <div className="mt-1.5">
            <ExpressionInput
              value={formData.value || ''}
              onChange={(value) => handleFieldChange('value', value)}
              placeholder="Enter value or use {{ }} expression..."
              availableVariables={availableVariables}
              type={selectedField?.type === 'number' ? 'number' : 'text'}
            />
          </div>
          {['in', 'not_in'].includes(formData.operator) && !String(formData.value).includes('{{') && (
            <p className="text-xs text-muted-foreground mt-1">
              For array operators, use comma-separated values (e.g., "EUR,USD,GBP")
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="label" className="text-xs">Label (Optional)</Label>
          <Input
            id="label"
            value={formData.label || ''}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            placeholder="e.g., High value check"
            className="mt-1.5"
          />
        </div>
      </div>
    );
  };

  const renderHttpRequestForm = () => {
    // Initialize defaults if not set
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
      }
    };

    return (
      <div className="space-y-5">
        {/* Quick Templates */}
        <div>
          <Label className="text-xs font-semibold mb-2 block">Quick Start Templates</Label>
          <Select onValueChange={handleLoadTemplate}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Load a template (optional)" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HTTP_REQUEST_TEMPLATES).map(([key, template]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Request Configuration */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Request</Label>
          <div className="space-y-3">
            {/* Method + URL */}
            <div className="grid grid-cols-[100px,1fr] gap-2">
              <Select value={method} onValueChange={(value) => handleConfigChange('method', value)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                    <SelectItem key={m} value={m} className="text-xs font-bold">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ExpressionInput
                value={url}
                onChange={(value) => handleConfigChange('url', value)}
                placeholder="https://api.example.com/endpoint"
                availableVariables={availableVariables}
              />
            </div>

            {/* Query Parameters */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Query Parameters</Label>
              <KeyValuePairBuilder
                items={queryParams}
                onChange={(items) => handleConfigChange('queryParams', items)}
                placeholder={{ key: 'param_name', value: 'param_value' }}
                expressionSupport={true}
                availableVariables={availableVariables}
                keyLabel="Parameter"
              />
            </div>

            {/* Headers */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Headers</Label>
              <KeyValuePairBuilder
                items={headers}
                onChange={(items) => handleConfigChange('headers', items)}
                placeholder={{ key: 'Header-Name', value: 'header value' }}
                expressionSupport={true}
                availableVariables={availableVariables}
                keyLabel="Header"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Body */}
        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <>
            <div>
              <Label className="text-sm font-semibold mb-3 block">Body</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium mb-2 block">Body Type</Label>
                  <Select value={bodyType} onValueChange={(value) => handleConfigChange('bodyType', value)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="FORM">Form URL Encoded</SelectItem>
                      <SelectItem value="RAW">Raw / Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bodyType !== 'NONE' && (
                  <div>
                    <Label className="text-xs font-medium mb-2 block">
                      {bodyType === 'JSON' && 'JSON Body'}
                      {bodyType === 'FORM' && 'Form Data (use Key-Value pairs)'}
                      {bodyType === 'RAW' && 'Raw Body'}
                    </Label>
                    <ExpressionInput
                      value={body}
                      onChange={(value) => handleConfigChange('body', value)}
                      placeholder={
                        bodyType === 'JSON'
                          ? '{\n  "key": "{{ $node.value }}"\n}'
                          : bodyType === 'FORM'
                          ? 'key1=value1&key2={{ $node.value }}'
                          : 'Raw content here'
                      }
                      availableVariables={availableVariables}
                      rows={8}
                      isJson={bodyType === 'JSON'}
                    />
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Authentication */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Authentication</Label>
          <div className="space-y-3">
            <Select
              value={authType}
              onValueChange={(value) => handleConfigChange('auth', { type: value })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
                <SelectItem value="API_KEY">API Key</SelectItem>
                <SelectItem value="OAUTH2">OAuth2</SelectItem>
                <SelectItem value="CUSTOM_HEADER">Custom Header</SelectItem>
              </SelectContent>
            </Select>

            {authType === 'BEARER_TOKEN' && (
              <div>
                <Label className="text-xs">Token</Label>
                <ExpressionInput
                  value={config.auth?.token || ''}
                  onChange={(value) => handleConfigChange('auth', { ...config.auth, type: authType, token: value })}
                  placeholder="Enter token or {{ $env.API_TOKEN }}"
                  availableVariables={availableVariables}
                />
              </div>
            )}

            {authType === 'BASIC_AUTH' && (
              <>
                <div>
                  <Label className="text-xs">Username</Label>
                  <ExpressionInput
                    value={config.auth?.username || ''}
                    onChange={(value) => handleConfigChange('auth', { ...config.auth, type: authType, username: value })}
                    placeholder="Username or {{ $env.API_USERNAME }}"
                    availableVariables={availableVariables}
                  />
                </div>
                <div>
                  <Label className="text-xs">Password</Label>
                  <ExpressionInput
                    value={config.auth?.password || ''}
                    onChange={(value) => handleConfigChange('auth', { ...config.auth, type: authType, password: value })}
                    placeholder="Password or {{ $env.API_PASSWORD }}"
                    availableVariables={availableVariables}
                    type="password"
                  />
                </div>
              </>
            )}

            {authType === 'API_KEY' && (
              <>
                <div>
                  <Label className="text-xs">Key Location</Label>
                  <Select
                    value={config.auth?.apiKeyLocation || 'HEADER'}
                    onValueChange={(value) => handleConfigChange('auth', { ...config.auth, type: authType, apiKeyLocation: value })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HEADER">Header</SelectItem>
                      <SelectItem value="QUERY">Query Parameter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Key Name</Label>
                  <Input
                    value={config.auth?.apiKeyName || ''}
                    onChange={(e) => handleConfigChange('auth', { ...config.auth, type: authType, apiKeyName: e.target.value })}
                    placeholder="X-API-Key"
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Key Value</Label>
                  <ExpressionInput
                    value={config.auth?.apiKeyValue || ''}
                    onChange={(value) => handleConfigChange('auth', { ...config.auth, type: authType, apiKeyValue: value })}
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
          <Label className="text-sm font-semibold mb-3 block">Response</Label>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Response Format</Label>
              <Select
                value={config.responseFormat || 'JSON'}
                onValueChange={(value) => handleConfigChange('responseFormat', value)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="TEXT">Text / String</SelectItem>
                  <SelectItem value="BINARY">Binary Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fullResponse"
                checked={config.fullResponse === true}
                onChange={(e) => handleConfigChange('fullResponse', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="fullResponse" className="text-xs cursor-pointer">
                Include Full Response (headers, status, body)
              </Label>
            </div>

            {!config.fullResponse && (
              <div>
                <Label className="text-xs">Extract Property (JSONPath)</Label>
                <Input
                  value={config.extractPath || ''}
                  onChange={(e) => handleConfigChange('extractPath', e.target.value)}
                  placeholder="data.results or $.items[*]"
                  className="text-xs font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to return full body. Use JSONPath to extract specific data.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">Success Status Codes</Label>
              <Input
                value={(config.successStatusCodes || [200, 201, 204]).join(', ')}
                onChange={(e) => {
                  const codes = e.target.value.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
                  handleConfigChange('successStatusCodes', codes);
                }}
                placeholder="200, 201, 204"
                className="text-xs font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated status codes that indicate success
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Error Handling */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Error Handling</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="retryOnFailure"
                checked={config.retryOnFailure === true}
                onChange={(e) => handleConfigChange('retryOnFailure', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="retryOnFailure" className="text-xs cursor-pointer">
                Retry on Failure
              </Label>
            </div>

            {config.retryOnFailure && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Retry Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={config.retryAttempts || 3}
                      onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value) || 3)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delay (ms)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={config.retryDelay || 1000}
                      onChange={(e) => handleConfigChange('retryDelay', parseInt(e.target.value) || 1000)}
                      className="text-xs"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exponential backoff: delay × 2^attempt
                </p>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Options */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Options</Label>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Timeout (ms)</Label>
              <Input
                type="number"
                value={timeout}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)}
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="followRedirects"
                checked={followRedirects}
                onChange={(e) => handleConfigChange('followRedirects', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="followRedirects" className="text-xs cursor-pointer">
                Follow Redirects
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="validateSSL"
                checked={validateSSL}
                onChange={(e) => handleConfigChange('validateSSL', e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="validateSSL" className="text-xs cursor-pointer">
                Validate SSL Certificates
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Test Panel */}
        <HttpRequestTester config={formData.config || {}} />
      </div>
    );
  };

  const renderActionForm = () => {
    const actionType = ACTION_TYPES.find(a => a.value === formData.actionType);

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="actionType" className="text-xs">Action Type</Label>
          <Select
            value={formData.actionType || ''}
            onValueChange={(value) => {
              handleFieldChange('actionType', value);
              handleFieldChange('config', {});
            }}
          >
            <SelectTrigger id="actionType" className="mt-1.5">
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {actionType && actionType.fields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-xs font-semibold">Action Configuration</Label>
              {actionType.fields.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key} className="text-xs">
                    {field.label}
                  </Label>
                  {field.type === 'textarea' ? (
                    <div className="mt-1.5">
                      <ExpressionInput
                        value={formData.config?.[field.key] || ''}
                        onChange={(value) => handleConfigChange(field.key, value)}
                        placeholder={`Enter ${field.label.toLowerCase()} or use {{ }} expression...`}
                        availableVariables={availableVariables}
                      />
                    </div>
                  ) : field.type === 'select' ? (
                    <Select
                      value={formData.config?.[field.key] || ''}
                      onValueChange={(value) => handleConfigChange(field.key, value)}
                    >
                      <SelectTrigger id={field.key} className="mt-1.5">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'number' ? (
                    <Input
                      id={field.key}
                      type="number"
                      value={formData.config?.[field.key] || ''}
                      onChange={(e) => handleConfigChange(field.key, parseInt(e.target.value))}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      className="mt-1.5"
                    />
                  ) : (
                    <div className="mt-1.5">
                      <ExpressionInput
                        value={formData.config?.[field.key] || ''}
                        onChange={(value) => handleConfigChange(field.key, value)}
                        placeholder={`Enter ${field.label.toLowerCase()} or use {{ }} expression...`}
                        availableVariables={availableVariables}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Node Properties</h3>
            <Badge variant="outline" className="mt-1 text-xs capitalize">
              {selectedNode.type === 'httpRequest' ? 'HTTP Request' : selectedNode.type}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedNode.type === 'trigger' && renderTriggerForm()}
        {selectedNode.type === 'condition' && renderConditionForm()}
        {selectedNode.type === 'action' && renderActionForm()}
        {selectedNode.type === 'httpRequest' && renderHttpRequestForm()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

