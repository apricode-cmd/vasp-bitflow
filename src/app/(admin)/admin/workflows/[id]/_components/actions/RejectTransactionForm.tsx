/**
 * REJECT_TRANSACTION Action Form - Enterprise Level
 * 
 * Full configuration for rejecting transactions with refund, blacklist, and customer communication
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
  ExpressionField,
  NumberField,
  TextField,
} from '../ActionFormComponents';
import type { RejectTransactionConfig } from '@/lib/validations/workflow-actions';

interface RejectTransactionFormProps {
  config: Partial<RejectTransactionConfig>;
  onChange: (config: Partial<RejectTransactionConfig>) => void;
  availableVariables: any[];
}

export default function RejectTransactionForm({
  config,
  onChange,
  availableVariables,
}: RejectTransactionFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const rejectionType = config.rejectionType || 'HARD';
  const reasonCategory = config.reasonCategory || 'OTHER';
  const notifyCustomer = config.notifyCustomer !== false;
  const includeNextSteps = config.includeNextSteps !== false;
  const processRefund = config.processRefund === true;
  const refundMethod = config.refundMethod || 'SAME';
  const refundTiming = config.refundTiming || '24H';
  const addToBlacklist = config.addToBlacklist === true;
  const blacklistDuration = config.blacklistDuration || 'TEMPORARY';

  return (
    <Accordion type="multiple" defaultValue={["rejection", "communication"]} className="w-full">
      
      {/* Rejection Details */}
      <AccordionItem value="rejection">
        <AccordionTrigger className="text-base font-semibold">
          Rejection Details
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Rejection Type"
              value={rejectionType}
              onChange={(val) => updateConfig('rejectionType', val)}
              options={[
                { value: 'HARD', label: 'Hard (Permanent)' },
                { value: 'SOFT', label: 'Soft (Retry Allowed)' },
              ]}
              helpText="Hard rejection permanently blocks this transaction. Soft allows customer to retry."
              required
            />

            <SelectField
              label="Reason Category"
              value={reasonCategory}
              onChange={(val) => updateConfig('reasonCategory', val)}
              options={[
                { value: 'AML_SANCTIONS', label: 'AML/Sanctions Match' },
                { value: 'HIGH_RISK_COUNTRY', label: 'High Risk Country' },
                { value: 'VELOCITY_LIMIT', label: 'Velocity Limit Exceeded' },
                { value: 'INSUFFICIENT_KYC', label: 'Insufficient KYC' },
                { value: 'MANUAL_REVIEW_FAILED', label: 'Manual Review Failed' },
                { value: 'FRAUD_SUSPECTED', label: 'Fraud Suspected' },
                { value: 'OTHER', label: 'Other' },
              ]}
              required
            />

            <TextareaField
              label="Custom Reason"
              value={config.customReason || ''}
              onChange={(val) => updateConfig('customReason', val)}
              placeholder="Provide detailed reason for rejection..."
              helpText="This reason will be logged in audit trail. Can include {{ variables }}."
              rows={3}
            />

            <ExpressionField
              label="Risk Score"
              value={config.riskScore?.toString() || ''}
              onChange={(val) => updateConfig('riskScore', parseFloat(val) || undefined)}
              availableVariables={availableVariables}
              placeholder="e.g., {{ $node.riskScore }}"
              helpText="Optional: Include risk score for audit (0-100)"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Customer Communication */}
      <AccordionItem value="communication">
        <AccordionTrigger className="text-base font-semibold">
          Customer Communication
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Notify Customer"
              checked={notifyCustomer}
              onChange={(val) => updateConfig('notifyCustomer', val)}
              helpText="Send notification email/in-app message to customer"
            />

            {notifyCustomer && (
              <>
                <TextField
                  label="Message Template"
                  value={config.messageTemplate || ''}
                  onChange={(val) => updateConfig('messageTemplate', val)}
                  placeholder="e.g., transaction_rejected_kyc"
                  helpText="Template ID for email/notification service"
                />

                <CheckboxField
                  label="Include Next Steps"
                  checked={includeNextSteps}
                  onChange={(val) => updateConfig('includeNextSteps', val)}
                  helpText="Show customer what they can do next (re-verify, contact support, etc.)"
                />

                <TextField
                  label="Support Contact"
                  value={config.supportContact || ''}
                  onChange={(val) => updateConfig('supportContact', val)}
                  placeholder="e.g., support@company.com or +1234567890"
                  helpText="Contact info for customer to reach support"
                />
              </>
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Refund & Accounting */}
      <AccordionItem value="refund">
        <AccordionTrigger className="text-base font-semibold">
          Refund & Accounting
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Process Refund"
              checked={processRefund}
              onChange={(val) => updateConfig('processRefund', val)}
              helpText="Automatically initiate refund to customer"
            />

            {processRefund && (
              <>
                <SelectField
                  label="Refund Method"
                  value={refundMethod}
                  onChange={(val) => updateConfig('refundMethod', val)}
                  options={[
                    { value: 'SAME', label: 'Same as Payment Method' },
                    { value: 'ALTERNATIVE', label: 'Alternative Method' },
                    { value: 'MANUAL', label: 'Manual Processing' },
                  ]}
                  helpText="How to return funds to customer"
                />

                <SelectField
                  label="Refund Timing"
                  value={refundTiming}
                  onChange={(val) => updateConfig('refundTiming', val)}
                  options={[
                    { value: 'IMMEDIATE', label: 'Immediate (if possible)' },
                    { value: '24H', label: 'Within 24 hours' },
                    { value: '48H', label: 'Within 48 hours' },
                    { value: '72H', label: 'Within 72 hours' },
                  ]}
                  helpText="SLA for refund processing"
                />
              </>
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Blacklist */}
      <AccordionItem value="blacklist">
        <AccordionTrigger className="text-base font-semibold">
          Blacklist
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Add to Blacklist"
              checked={addToBlacklist}
              onChange={(val) => updateConfig('addToBlacklist', val)}
              helpText="⚠️ Block this user/wallet from future transactions"
            />

            {addToBlacklist && (
              <>
                <SelectField
                  label="Blacklist Duration"
                  value={blacklistDuration}
                  onChange={(val) => updateConfig('blacklistDuration', val)}
                  options={[
                    { value: 'PERMANENT', label: 'Permanent (requires manual removal)' },
                    { value: 'TEMPORARY', label: 'Temporary (auto-remove after X days)' },
                  ]}
                  helpText="How long user should remain blacklisted"
                />

                {blacklistDuration === 'TEMPORARY' && (
                  <NumberField
                    label="Blacklist Days"
                    value={config.blacklistDays || 30}
                    onChange={(val) => updateConfig('blacklistDays', val)}
                    min={1}
                    max={365}
                    helpText="Number of days before automatic removal from blacklist"
                  />
                )}
              </>
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

