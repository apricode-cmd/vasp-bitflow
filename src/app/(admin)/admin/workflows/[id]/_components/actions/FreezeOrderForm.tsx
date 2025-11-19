/**
 * FREEZE_ORDER Action Form - Enterprise Level
 * 
 * Full configuration for freezing orders with auto-unfreeze conditions
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
import type { FreezeOrderConfig } from '@/lib/validations/workflow-actions';

interface FreezeOrderFormProps {
  config: Partial<FreezeOrderConfig>;
  onChange: (config: Partial<FreezeOrderConfig>) => void;
  availableVariables: any[];
}

export default function FreezeOrderForm({
  config,
  onChange,
  availableVariables,
}: FreezeOrderFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const immediateFreeze = config.immediateFreeze !== false;
  const freezeDuration = config.freezeDuration || '24H';
  const reasonCategory = config.reasonCategory || 'MANUAL_REVIEW';
  const notifyCustomer = config.notifyCustomer !== false;
  const autoUnfreezeEnabled = config.autoUnfreezeEnabled === true;
  const requireApprovalToUnfreeze = config.requireApprovalToUnfreeze !== false;
  const approverRole = config.approverRole || 'COMPLIANCE';

  return (
    <Accordion type="multiple" defaultValue={["freeze", "unfreeze"]} className="w-full">
      
      {/* Freeze Configuration */}
      <AccordionItem value="freeze">
        <AccordionTrigger className="text-base font-semibold">
          Freeze Configuration
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Immediate Freeze"
              checked={immediateFreeze}
              onChange={(val) => updateConfig('immediateFreeze', val)}
              helpText="Apply freeze instantly when this action executes"
            />

            <SelectField
              label="Freeze Duration"
              value={freezeDuration}
              onChange={(val) => updateConfig('freezeDuration', val)}
              options={[
                { value: 'INDEFINITE', label: 'Indefinite (manual unfreeze only)' },
                { value: '24H', label: '24 Hours' },
                { value: '48H', label: '48 Hours' },
                { value: '7D', label: '7 Days' },
                { value: '30D', label: '30 Days' },
                { value: 'CUSTOM', label: 'Custom Duration' },
              ]}
              required
            />

            {freezeDuration === 'CUSTOM' && (
              <NumberField
                label="Custom Duration (Hours)"
                value={config.customDurationHours || 24}
                onChange={(val) => updateConfig('customDurationHours', val)}
                min={1}
                max={720}
                helpText="Maximum 720 hours (30 days)"
              />
            )}

            <SelectField
              label="Reason Category"
              value={reasonCategory}
              onChange={(val) => updateConfig('reasonCategory', val)}
              options={[
                { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity' },
                { value: 'AML_ALERT', label: 'AML Alert' },
                { value: 'MANUAL_REVIEW', label: 'Manual Review Required' },
                { value: 'FRAUD_INVESTIGATION', label: 'Fraud Investigation' },
                { value: 'COMPLIANCE_CHECK', label: 'Compliance Check' },
                { value: 'OTHER', label: 'Other' },
              ]}
              required
            />

            <TextareaField
              label="Reason"
              value={config.reason || ''}
              onChange={(val) => updateConfig('reason', val)}
              placeholder="Detailed reason for freezing this order..."
              helpText="This will be logged and may be shown to customer if notified"
              rows={3}
              required
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Notifications */}
      <AccordionItem value="notifications">
        <AccordionTrigger className="text-base font-semibold">
          Notifications
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Notify Customer"
              checked={notifyCustomer}
              onChange={(val) => updateConfig('notifyCustomer', val)}
              helpText="Send notification to customer about the freeze"
            />

            {notifyCustomer && (
              <TextField
                label="Notification Template"
                value={config.notificationTemplate || ''}
                onChange={(val) => updateConfig('notificationTemplate', val)}
                placeholder="e.g., order_frozen_review"
                helpText="Template ID for notification service"
              />
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Auto-Unfreeze Conditions */}
      <AccordionItem value="unfreeze">
        <AccordionTrigger className="text-base font-semibold">
          Unfreeze Conditions
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Enable Auto-Unfreeze"
              checked={autoUnfreezeEnabled}
              onChange={(val) => updateConfig('autoUnfreezeEnabled', val)}
              helpText="Automatically unfreeze when specific conditions are met"
            />

            {autoUnfreezeEnabled && (
              <div className="pl-6 space-y-3 border-l-2 border-primary/30">
                <p className="text-xs text-muted-foreground mb-2">
                  Order will auto-unfreeze when ANY of these conditions are met:
                </p>

                <SelectField
                  label="Approved By Role"
                  value={config.autoUnfreezeConditions?.approvedByRole || ''}
                  onChange={(val) => updateConfig('autoUnfreezeConditions', {
                    ...config.autoUnfreezeConditions,
                    approvedByRole: val as 'ADMIN' | 'COMPLIANCE' | 'SUPER_ADMIN',
                  })}
                  options={[
                    { value: '', label: 'Not required' },
                    { value: 'ADMIN', label: 'Approved by Admin' },
                    { value: 'COMPLIANCE', label: 'Approved by Compliance' },
                    { value: 'SUPER_ADMIN', label: 'Approved by Super Admin' },
                  ]}
                />

                <CheckboxField
                  label="Documents Verified"
                  checked={config.autoUnfreezeConditions?.documentsVerified === true}
                  onChange={(val) => updateConfig('autoUnfreezeConditions', {
                    ...config.autoUnfreezeConditions,
                    documentsVerified: val,
                  })}
                  helpText="Unfreeze when all required documents are verified"
                />

                <NumberField
                  label="Risk Score Below"
                  value={config.autoUnfreezeConditions?.riskScoreBelow || 0}
                  onChange={(val) => updateConfig('autoUnfreezeConditions', {
                    ...config.autoUnfreezeConditions,
                    riskScoreBelow: val || undefined,
                  })}
                  min={0}
                  max={100}
                  helpText="Unfreeze when risk score drops below this value (0 = disabled)"
                />

                <CheckboxField
                  label="Time Elapsed"
                  checked={config.autoUnfreezeConditions?.timeElapsed === true}
                  onChange={(val) => updateConfig('autoUnfreezeConditions', {
                    ...config.autoUnfreezeConditions,
                    timeElapsed: val,
                  })}
                  helpText="Auto-unfreeze after configured duration expires"
                />
              </div>
            )}

            <CheckboxField
              label="Require Approval to Unfreeze"
              checked={requireApprovalToUnfreeze}
              onChange={(val) => updateConfig('requireApprovalToUnfreeze', val)}
              helpText="Manual approval required to unfreeze (overrides auto-unfreeze)"
            />

            {requireApprovalToUnfreeze && (
              <SelectField
                label="Approver Role"
                value={approverRole}
                onChange={(val) => updateConfig('approverRole', val)}
                options={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'COMPLIANCE', label: 'Compliance Officer' },
                  { value: 'SUPER_ADMIN', label: 'Super Admin' },
                ]}
                helpText="Who can approve unfreeze requests"
              />
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

