/**
 * REQUIRE_APPROVAL Action Form - Enterprise Level
 * 
 * Full configuration for approval workflows with sequential/parallel flows
 */

'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  SelectField,
  TextareaField,
  CheckboxField,
  NumberField,
  TextField,
} from '../ActionFormComponents';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { RequireApprovalConfig } from '@/lib/validations/workflow-actions';

interface RequireApprovalFormProps {
  config: Partial<RequireApprovalConfig>;
  onChange: (config: Partial<RequireApprovalConfig>) => void;
  availableVariables: any[];
}

export default function RequireApprovalForm({
  config,
  onChange,
  availableVariables,
}: RequireApprovalFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const approvalType = config.approvalType || 'SEQUENTIAL';
  const requiredApprovers = config.requiredApprovers || [{ role: 'COMPLIANCE', minApprovals: 1 }];
  const autoApproveOnTimeout = config.autoApproveOnTimeout === true;
  const includeOrderDetails = config.includeOrderDetails !== false;
  const includeUserProfile = config.includeUserProfile !== false;
  const includeRiskAssessment = config.includeRiskAssessment !== false;
  const includeTransactionHistory = config.includeTransactionHistory === true;
  const onApprove = config.onApprove || 'CONTINUE';
  const onReject = config.onReject || 'CANCEL';
  const onTimeout = config.onTimeout || 'ESCALATE';
  const notifyRequester = config.notifyRequester !== false;

  const addApprover = () => {
    updateConfig('requiredApprovers', [
      ...requiredApprovers,
      { role: 'ADMIN', minApprovals: 1 },
    ]);
  };

  const removeApprover = (index: number) => {
    updateConfig('requiredApprovers', requiredApprovers.filter((_, i) => i !== index));
  };

  const updateApprover = (index: number, field: string, value: any) => {
    const updated = [...requiredApprovers];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig('requiredApprovers', updated);
  };

  return (
    <Accordion type="multiple" defaultValue={["approval", "context"]} className="w-full">
      
      {/* Approval Configuration */}
      <AccordionItem value="approval">
        <AccordionTrigger className="text-base font-semibold">
          Approval Configuration
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Approval Type"
              value={approvalType}
              onChange={(val) => updateConfig('approvalType', val)}
              options={[
                { value: 'SEQUENTIAL', label: 'Sequential (one by one)' },
                { value: 'PARALLEL', label: 'Parallel (all at once)' },
                { value: 'QUORUM', label: 'Quorum (N of M approvers)' },
              ]}
              helpText="How approvals should be processed"
              required
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Required Approvers</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addApprover}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Approver
                </Button>
              </div>

              {requiredApprovers.map((approver, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <SelectField
                        label="Role"
                        value={approver.role}
                        onChange={(val) => updateApprover(index, 'role', val)}
                        options={[
                          { value: 'ADMIN', label: 'Admin' },
                          { value: 'COMPLIANCE', label: 'Compliance' },
                          { value: 'SUPER_ADMIN', label: 'Super Admin' },
                        ]}
                      />
                      <NumberField
                        label="Min Approvals"
                        value={approver.minApprovals}
                        onChange={(val) => updateApprover(index, 'minApprovals', val)}
                        min={1}
                        max={10}
                      />
                    </div>
                    {requiredApprovers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprover(index)}
                        className="h-7 w-7 p-0 mt-5"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <TextField
                    label="Specific User ID (optional)"
                    value={approver.specificUserId || ''}
                    onChange={(val) => updateApprover(index, 'specificUserId', val)}
                    placeholder="user-id or email"
                    helpText="Leave empty to assign to any user with this role"
                  />
                </div>
              ))}
            </div>

            <NumberField
              label="Timeout (Hours)"
              value={config.timeout || 24}
              onChange={(val) => updateConfig('timeout', val)}
              min={1}
              max={168}
              helpText="Maximum time to wait for approval (max 1 week)"
            />

            <CheckboxField
              label="Auto-Approve on Timeout"
              checked={autoApproveOnTimeout}
              onChange={(val) => updateConfig('autoApproveOnTimeout', val)}
              helpText="⚠️ Automatically approve if timeout is reached (use with caution)"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Approval Context */}
      <AccordionItem value="context">
        <AccordionTrigger className="text-base font-semibold">
          Approval Context
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <TextField
              label="Title"
              value={config.title || ''}
              onChange={(val) => updateConfig('title', val)}
              placeholder="e.g., High-Value Transaction Approval Required"
              helpText="Title shown to approvers. Can use {{ variables }}"
              required
            />

            <TextareaField
              label="Description"
              value={config.description || ''}
              onChange={(val) => updateConfig('description', val)}
              placeholder="Detailed description of what needs approval and why..."
              helpText="Full context for approvers. Can use {{ variables }}"
              rows={4}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium">Include in Approval Request:</label>
              <div className="pl-4 space-y-2">
                <CheckboxField
                  label="Order Details"
                  checked={includeOrderDetails}
                  onChange={(val) => updateConfig('includeOrderDetails', val)}
                  helpText="Amount, currency, wallet, etc."
                />
                <CheckboxField
                  label="User Profile"
                  checked={includeUserProfile}
                  onChange={(val) => updateConfig('includeUserProfile', val)}
                  helpText="User info, KYC status, tier, etc."
                />
                <CheckboxField
                  label="Risk Assessment"
                  checked={includeRiskAssessment}
                  onChange={(val) => updateConfig('includeRiskAssessment', val)}
                  helpText="Risk score, flags, alerts"
                />
                <CheckboxField
                  label="Transaction History"
                  checked={includeTransactionHistory}
                  onChange={(val) => updateConfig('includeTransactionHistory', val)}
                  helpText="Past orders and activity"
                />
              </div>
            </div>

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Actions on Response */}
      <AccordionItem value="actions">
        <AccordionTrigger className="text-base font-semibold">
          Actions on Response
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="On Approve"
              value={onApprove}
              onChange={(val) => updateConfig('onApprove', val)}
              options={[
                { value: 'CONTINUE', label: 'Continue Workflow' },
                { value: 'COMPLETE', label: 'Complete Order' },
                { value: 'CUSTOM', label: 'Custom Action' },
              ]}
              helpText="What happens when approved"
            />

            <SelectField
              label="On Reject"
              value={onReject}
              onChange={(val) => updateConfig('onReject', val)}
              options={[
                { value: 'CANCEL', label: 'Cancel Order' },
                { value: 'FREEZE', label: 'Freeze Order' },
                { value: 'ESCALATE', label: 'Escalate to Compliance' },
                { value: 'CUSTOM', label: 'Custom Action' },
              ]}
              helpText="What happens when rejected"
            />

            <SelectField
              label="On Timeout"
              value={onTimeout}
              onChange={(val) => updateConfig('onTimeout', val)}
              options={[
                { value: 'ESCALATE', label: 'Escalate to Higher Role' },
                { value: 'CANCEL', label: 'Cancel Order' },
                { value: 'AUTO_APPROVE', label: 'Auto-Approve' },
                { value: 'CUSTOM', label: 'Custom Action' },
              ]}
              helpText="What happens if no response in time"
            />

            <CheckboxField
              label="Notify Requester"
              checked={notifyRequester}
              onChange={(val) => updateConfig('notifyRequester', val)}
              helpText="Send notification when approval is completed"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

