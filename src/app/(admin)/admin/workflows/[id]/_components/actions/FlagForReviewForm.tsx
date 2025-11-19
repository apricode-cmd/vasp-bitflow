/**
 * FLAG_FOR_REVIEW Action Form - Enterprise Level
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
import type { FlagForReviewConfig } from '@/lib/validations/workflow-actions';

interface FlagForReviewFormProps {
  config: Partial<FlagForReviewConfig>;
  onChange: (config: Partial<FlagForReviewConfig>) => void;
  availableVariables: any[];
}

export default function FlagForReviewForm({
  config,
  onChange,
  availableVariables,
}: FlagForReviewFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const flagType = config.flagType || 'MANUAL_REVIEW';
  const severity = config.severity || 'MEDIUM';
  const priority = config.priority || 'NORMAL';
  const assignmentType = config.assignmentType || 'AUTO';

  return (
    <Accordion type="multiple" defaultValue={["flag", "assignment"]} className="w-full">
      
      <AccordionItem value="flag">
        <AccordionTrigger className="text-base font-semibold">
          Flag Configuration
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Flag Type"
              value={flagType}
              onChange={(val) => updateConfig('flagType', val)}
              options={[
                { value: 'MANUAL_REVIEW', label: 'Manual Review' },
                { value: 'AML_INVESTIGATION', label: 'AML Investigation' },
                { value: 'FRAUD_CHECK', label: 'Fraud Check' },
                { value: 'DOCUMENT_VERIFICATION', label: 'Document Verification' },
                { value: 'RISK_ASSESSMENT', label: 'Risk Assessment' },
              ]}
              required
            />

            <SelectField
              label="Severity"
              value={severity}
              onChange={(val) => updateConfig('severity', val)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'CRITICAL', label: 'Critical' },
              ]}
            />

            <SelectField
              label="Priority"
              value={priority}
              onChange={(val) => updateConfig('priority', val)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />

            <TextareaField
              label="Reason"
              value={config.reason || ''}
              onChange={(val) => updateConfig('reason', val)}
              placeholder="Detailed reason for flagging..."
              rows={3}
              required
            />

            <TextField
              label="Evidence (URLs/Paths)"
              value={config.evidence?.join(', ') || ''}
              onChange={(val) => updateConfig('evidence', val ? val.split(',').map(s => s.trim()) : [])}
              placeholder="https://evidence1.com, /path/to/file"
              helpText="Comma-separated links or file paths"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="assignment">
        <AccordionTrigger className="text-base font-semibold">
          Assignment
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Assignment Type"
              value={assignmentType}
              onChange={(val) => updateConfig('assignmentType', val)}
              options={[
                { value: 'AUTO', label: 'Auto (based on type)' },
                { value: 'ROLE', label: 'Specific Role' },
                { value: 'USER', label: 'Specific User' },
                { value: 'ROUND_ROBIN', label: 'Round Robin' },
              ]}
            />

            {assignmentType === 'ROLE' && (
              <SelectField
                label="Assign to Role"
                value={config.assignRole || ''}
                onChange={(val) => updateConfig('assignRole', val)}
                options={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'COMPLIANCE', label: 'Compliance' },
                  { value: 'SUPER_ADMIN', label: 'Super Admin' },
                ]}
              />
            )}

            {assignmentType === 'USER' && (
              <TextField
                label="Assign to User ID"
                value={config.assignUserId || ''}
                onChange={(val) => updateConfig('assignUserId', val)}
                placeholder="user-id or email"
              />
            )}

            <NumberField
              label="SLA (Hours)"
              value={config.slaHours || 24}
              onChange={(val) => updateConfig('slaHours', val)}
              min={1}
              max={168}
              helpText="Must be reviewed within this time"
            />

            <NumberField
              label="Escalate After (Hours)"
              value={config.escalateAfterHours || 48}
              onChange={(val) => updateConfig('escalateAfterHours', val)}
              min={1}
              max={336}
              helpText="Auto-escalate if not resolved"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="context">
        <AccordionTrigger className="text-base font-semibold">
          Review Context
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Include in Review Queue"
              checked={config.includeInReviewQueue !== false}
              onChange={(val) => updateConfig('includeInReviewQueue', val)}
              helpText="Add to admin review queue dashboard"
            />

            <CheckboxField
              label="Block Transaction"
              checked={config.blockTransaction === true}
              onChange={(val) => updateConfig('blockTransaction', val)}
              helpText="Prevent transaction from proceeding until reviewed"
            />

            <CheckboxField
              label="Notify Customer"
              checked={config.notifyCustomer === true}
              onChange={(val) => updateConfig('notifyCustomer', val)}
              helpText="Send notification to customer about review"
            />

            <CheckboxField
              label="Show Related Flags"
              checked={config.showRelatedFlags !== false}
              onChange={(val) => updateConfig('showRelatedFlags', val)}
              helpText="Show similar past flags for this user"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

