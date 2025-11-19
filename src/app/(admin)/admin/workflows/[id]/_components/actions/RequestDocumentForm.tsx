/**
 * REQUEST_DOCUMENT Action Form - Enterprise Level
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RequestDocumentConfig } from '@/lib/validations/workflow-actions';

interface RequestDocumentFormProps {
  config: Partial<RequestDocumentConfig>;
  onChange: (config: Partial<RequestDocumentConfig>) => void;
  availableVariables: any[];
}

const DOCUMENT_TYPES = [
  { value: 'PROOF_OF_ADDRESS', label: 'Proof of Address' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
  { value: 'SOURCE_OF_FUNDS', label: 'Source of Funds' },
  { value: 'TAX_RETURN', label: 'Tax Return' },
  { value: 'UTILITY_BILL', label: 'Utility Bill' },
  { value: 'PAYSLIP', label: 'Payslip' },
  { value: 'PHOTO_ID', label: 'Photo ID' },
  { value: 'SELFIE', label: 'Selfie' },
  { value: 'OTHER', label: 'Other' },
];

export default function RequestDocumentForm({
  config,
  onChange,
  availableVariables,
}: RequestDocumentFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const documentTypes = config.documentTypes || [];
  const dueDate = config.dueDate || '7D';
  const priority = config.priority || 'NORMAL';
  const language = config.language || 'AUTO';
  const requiredQuality = config.requiredQuality || 'MEDIUM';

  const toggleDocumentType = (type: string) => {
    const types = documentTypes.includes(type as any)
      ? documentTypes.filter(t => t !== type)
      : [...documentTypes, type as any];
    updateConfig('documentTypes', types);
  };

  return (
    <Accordion type="multiple" defaultValue={["documents", "message"]} className="w-full">
      
      <AccordionItem value="documents">
        <AccordionTrigger className="text-base font-semibold">
          Document Request
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <div className="space-y-2">
              <Label className="text-xs font-medium">Document Types *</Label>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map((doc) => (
                  <div key={doc.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={doc.value}
                      checked={documentTypes.includes(doc.value as any)}
                      onCheckedChange={() => toggleDocumentType(doc.value)}
                    />
                    <Label htmlFor={doc.value} className="text-xs cursor-pointer">
                      {doc.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <SelectField
              label="Due Date"
              value={dueDate}
              onChange={(val) => updateConfig('dueDate', val)}
              options={[
                { value: '3D', label: '3 Days' },
                { value: '7D', label: '7 Days' },
                { value: '14D', label: '14 Days' },
                { value: '30D', label: '30 Days' },
                { value: 'CUSTOM', label: 'Custom' },
              ]}
            />

            {dueDate === 'CUSTOM' && (
              <NumberField
                label="Custom Due Days"
                value={config.customDueDays || 7}
                onChange={(val) => updateConfig('customDueDays', val)}
                min={1}
                max={90}
              />
            )}

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

            <CheckboxField
              label="Allow Partial Upload"
              checked={config.allowPartialUpload === true}
              onChange={(val) => updateConfig('allowPartialUpload', val)}
              helpText="Allow user to submit some documents now, others later"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="message">
        <AccordionTrigger className="text-base font-semibold">
          Customer Message
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <TextField
              label="Template"
              value={config.template || ''}
              onChange={(val) => updateConfig('template', val)}
              placeholder="e.g., document_request_kyc"
            />

            <TextareaField
              label="Custom Message"
              value={config.customMessage || ''}
              onChange={(val) => updateConfig('customMessage', val)}
              placeholder="Please upload the following documents..."
              rows={3}
            />

            <SelectField
              label="Language"
              value={language}
              onChange={(val) => updateConfig('language', val)}
              options={[
                { value: 'AUTO', label: 'Auto-detect' },
                { value: 'EN', label: 'English' },
                { value: 'PL', label: 'Polish' },
                { value: 'RU', label: 'Russian' },
                { value: 'ES', label: 'Spanish' },
                { value: 'FR', label: 'French' },
                { value: 'DE', label: 'German' },
              ]}
            />

            <CheckboxField
              label="Include Upload Link"
              checked={config.includeUploadLink !== false}
              onChange={(val) => updateConfig('includeUploadLink', val)}
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="criteria">
        <AccordionTrigger className="text-base font-semibold">
          Acceptance Criteria
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Required Quality"
              value={requiredQuality}
              onChange={(val) => updateConfig('requiredQuality', val)}
              options={[
                { value: 'LOW', label: 'Low (any readable image)' },
                { value: 'MEDIUM', label: 'Medium (clear, no blur)' },
                { value: 'HIGH', label: 'High (HD quality)' },
              ]}
            />

            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Min File Size (KB)"
                value={config.minFileSizeKB || 100}
                onChange={(val) => updateConfig('minFileSizeKB', val)}
                min={10}
                max={1024}
              />
              <NumberField
                label="Max File Size (MB)"
                value={config.maxFileSizeMB || 10}
                onChange={(val) => updateConfig('maxFileSizeMB', val)}
                min={1}
                max={50}
              />
            </div>

            <CheckboxField
              label="Auto-Verify"
              checked={config.autoVerify === true}
              onChange={(val) => updateConfig('autoVerify', val)}
              helpText="Attempt automatic document verification"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="followup">
        <AccordionTrigger className="text-base font-semibold">
          Follow-up Actions
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <NumberField
              label="Reminder After (Days)"
              value={config.reminderAfterDays || 3}
              onChange={(val) => updateConfig('reminderAfterDays', val)}
              min={1}
              max={30}
            />

            <CheckboxField
              label="Auto-Reject if Not Submitted"
              checked={config.autoRejectIfNotSubmitted === true}
              onChange={(val) => updateConfig('autoRejectIfNotSubmitted', val)}
            />

            <NumberField
              label="Escalate After (Days)"
              value={config.escalateAfterDays || 7}
              onChange={(val) => updateConfig('escalateAfterDays', val)}
              min={1}
              max={90}
            />

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

