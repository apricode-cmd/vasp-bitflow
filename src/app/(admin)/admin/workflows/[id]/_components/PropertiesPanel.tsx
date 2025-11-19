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
    return (
      <div className="space-y-6">
        {/* Request Section */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Request Configuration</Label>
          <div className="space-y-4">
            {/* Method + URL in one row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="method" className="text-xs">Method *</Label>
                <Select
                  value={formData.config?.method || 'GET'}
                  onValueChange={(value) => handleConfigChange('method', value)}
                >
                  <SelectTrigger id="method" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="url" className="text-xs">URL *</Label>
                <div className="mt-1.5">
                  <ExpressionInput
                    value={formData.config?.url || ''}
                    onChange={(value) => handleConfigChange('url', value)}
                    placeholder="https://api.example.com/endpoint"
                    availableVariables={availableVariables}
                  />
                </div>
              </div>
            </div>

            {/* Request Body */}
            {['POST', 'PUT', 'PATCH'].includes(formData.config?.method || '') && (
              <div>
                <Label htmlFor="body" className="text-xs">Request Body (JSON)</Label>
                <div className="mt-1.5">
                  <ExpressionInput
                    value={formData.config?.body || ''}
                    onChange={(value) => handleConfigChange('body', value)}
                    placeholder='{"key": "value"} or use {{ }} expressions'
                    availableVariables={availableVariables}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Authentication Section */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Authentication</Label>
          <div className="space-y-4">
            <div>
              <Label htmlFor="authType" className="text-xs">Auth Type</Label>
              <Select
                value={formData.config?.authType || 'NONE'}
                onValueChange={(value) => handleConfigChange('authType', value)}
              >
                <SelectTrigger id="authType" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                  <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
                  <SelectItem value="API_KEY">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.config?.authType && formData.config.authType !== 'NONE' && (
              <div>
                <Label htmlFor="authToken" className="text-xs">
                  {formData.config.authType === 'BEARER_TOKEN' && 'Bearer Token'}
                  {formData.config.authType === 'BASIC_AUTH' && 'Username:Password'}
                  {formData.config.authType === 'API_KEY' && 'API Key'}
                </Label>
                <div className="mt-1.5">
                  <ExpressionInput
                    value={formData.config?.authToken || ''}
                    onChange={(value) => handleConfigChange('authToken', value)}
                    placeholder="Enter token or use {{ $env.API_KEY }}"
                    availableVariables={availableVariables}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Options Section */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Options</Label>
          <div className="space-y-4">
            <div>
              <Label htmlFor="timeout" className="text-xs">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={formData.config?.timeout || 30000}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)}
                placeholder="30000"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: 30000ms (30 seconds)
              </p>
            </div>
          </div>
        </div>
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

