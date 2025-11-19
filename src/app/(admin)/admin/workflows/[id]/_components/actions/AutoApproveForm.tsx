/**
 * AUTO_APPROVE Action Form - Enterprise Level
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
  ExpressionField,
} from '../ActionFormComponents';
import type { AutoApproveConfig } from '@/lib/validations/workflow-actions';

interface AutoApproveFormProps {
  config: Partial<AutoApproveConfig>;
  onChange: (config: Partial<AutoApproveConfig>) => void;
  availableVariables: any[];
}

export default function AutoApproveForm({
  config,
  onChange,
  availableVariables,
}: AutoApproveFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const reasonCategory = config.reasonCategory || 'LOW_RISK_SCORE';
  const bypassManualReview = config.bypassManualReview !== false;
  const logApproval = config.logApproval !== false;
  const notifyCustomer = config.notifyCustomer !== false;
  const sendReceipt = config.sendReceipt !== false;

  return (
    <Accordion type="multiple" defaultValue={["approval", "logging"]} className="w-full">
      
      <AccordionItem value="approval">
        <AccordionTrigger className="text-base font-semibold">
          Approval Configuration
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <ExpressionField
              label="Approval Reason"
              value={config.approvalReason || 'Auto-approved based on conditions'}
              onChange={(val) => updateConfig('approvalReason', val)}
              availableVariables={availableVariables}
              placeholder="e.g., Low risk score: {{ $node.riskScore }}"
              helpText="Reason that will be logged and shown"
            />

            <ExpressionField
              label="Risk Score"
              value={config.riskScore?.toString() || ''}
              onChange={(val) => updateConfig('riskScore', parseFloat(val) || undefined)}
              availableVariables={availableVariables}
              placeholder="e.g., {{ $node.riskScore }}"
              helpText="Optional: include risk score for audit"
            />

            <CheckboxField
              label="Bypass Manual Review"
              checked={bypassManualReview}
              onChange={(val) => updateConfig('bypassManualReview', val)}
              helpText="Skip any pending manual review steps"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="logging">
        <AccordionTrigger className="text-base font-semibold">
          Logging & Audit
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Log Approval"
              checked={logApproval}
              onChange={(val) => updateConfig('logApproval', val)}
              helpText="Record this auto-approval in audit log (recommended)"
            />

            <SelectField
              label="Reason Category"
              value={reasonCategory}
              onChange={(val) => updateConfig('reasonCategory', val)}
              options={[
                { value: 'LOW_RISK_SCORE', label: 'Low Risk Score' },
                { value: 'TRUSTED_CUSTOMER', label: 'Trusted Customer' },
                { value: 'SMALL_AMOUNT', label: 'Small Amount' },
                { value: 'WHITELISTED', label: 'Whitelisted' },
                { value: 'VERIFIED_USER', label: 'Verified User' },
              ]}
              helpText="Category for reporting and analytics"
            />

            <TextareaField
              label="Note"
              value={config.note || ''}
              onChange={(val) => updateConfig('note', val)}
              placeholder="Additional notes for audit trail..."
              rows={2}
              helpText="Optional internal notes"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="post-approval">
        <AccordionTrigger className="text-base font-semibold">
          Post-Approval Actions
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Notify Customer"
              checked={notifyCustomer}
              onChange={(val) => updateConfig('notifyCustomer', val)}
              helpText="Send approval notification to customer"
            />

            <CheckboxField
              label="Send Receipt"
              checked={sendReceipt}
              onChange={(val) => updateConfig('sendReceipt', val)}
              helpText="Email transaction receipt"
            />

            <CheckboxField
              label="Update User Tier"
              checked={config.updateUserTier === true}
              onChange={(val) => updateConfig('updateUserTier', val)}
              helpText="Upgrade user tier based on successful transaction"
            />

            <CheckboxField
              label="Add to Fast Track"
              checked={config.addToFastTrack === true}
              onChange={(val) => updateConfig('addToFastTrack', val)}
              helpText="Add user to fast-track list for future transactions"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

