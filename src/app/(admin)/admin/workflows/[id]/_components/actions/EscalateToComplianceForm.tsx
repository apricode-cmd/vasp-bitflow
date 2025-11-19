/**
 * ESCALATE_TO_COMPLIANCE Action Form - Enterprise Level
 * 
 * Full configuration for compliance escalation with case management and external reporting
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
import type { EscalateToComplianceConfig } from '@/lib/validations/workflow-actions';

interface EscalateToComplianceFormProps {
  config: Partial<EscalateToComplianceConfig>;
  onChange: (config: Partial<EscalateToComplianceConfig>) => void;
  availableVariables: any[];
}

export default function EscalateToComplianceForm({
  config,
  onChange,
  availableVariables,
}: EscalateToComplianceFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const escalationType = config.escalationType || 'OTHER';
  const severity = config.severity || 'HIGH';
  const urgency = config.urgency || 'HIGH';
  const primaryContact = config.primaryContact || 'AUTO';
  const autoEscalateToMLRO = config.autoEscalateToMLRO === true;
  const blockAllTransactions = config.blockAllTransactions !== false;
  const freezeAccount = config.freezeAccount === true;
  const notifyCustomer = config.notifyCustomer === true;
  const externalReportingRequired = config.externalReportingRequired === true;
  const createCase = config.createCase !== false;
  const caseType = config.caseType || 'INVESTIGATION';
  const trackTime = config.trackTime !== false;

  return (
    <Accordion type="multiple" defaultValue={["escalation", "assignment", "impact"]} className="w-full">
      
      {/* Escalation Details */}
      <AccordionItem value="escalation">
        <AccordionTrigger className="text-base font-semibold">
          Escalation Details
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Escalation Type"
              value={escalationType}
              onChange={(val) => updateConfig('escalationType', val)}
              options={[
                { value: 'AML_ALERT', label: 'AML Alert' },
                { value: 'SANCTIONS_HIT', label: 'Sanctions Hit' },
                { value: 'HIGH_RISK_TRANSACTION', label: 'High Risk Transaction' },
                { value: 'FRAUD_SUSPECTED', label: 'Fraud Suspected' },
                { value: 'KYC_ISSUE', label: 'KYC Issue' },
                { value: 'REGULATORY_REPORTING', label: 'Regulatory Reporting Required' },
                { value: 'OTHER', label: 'Other' },
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
                { value: 'HIGH', label: 'High ⚠️' },
                { value: 'CRITICAL', label: 'Critical 🚨' },
              ]}
              required
            />

            <SelectField
              label="Urgency"
              value={urgency}
              onChange={(val) => updateConfig('urgency', val)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'IMMEDIATE', label: 'Immediate ⚡' },
              ]}
              required
            />

            <TextareaField
              label="Reason"
              value={config.reason || ''}
              onChange={(val) => updateConfig('reason', val)}
              placeholder="Detailed reason for compliance escalation..."
              helpText="This will be visible to compliance team and logged in audit trail"
              rows={3}
              required
            />

            <TextField
              label="Evidence (URLs/Paths)"
              value={config.evidence?.join(', ') || ''}
              onChange={(val) => updateConfig('evidence', val ? val.split(',').map(s => s.trim()) : [])}
              placeholder="https://evidence1.com, /path/to/file2"
              helpText="Comma-separated URLs or file paths to supporting evidence"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Compliance Assignment */}
      <AccordionItem value="assignment">
        <AccordionTrigger className="text-base font-semibold">
          Compliance Assignment
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <SelectField
              label="Primary Contact"
              value={primaryContact}
              onChange={(val) => updateConfig('primaryContact', val)}
              options={[
                { value: 'AUTO', label: 'Auto-assign (based on type)' },
                { value: 'SELECT', label: 'Select specific user' },
              ]}
              required
            />

            {primaryContact === 'SELECT' && (
              <>
                <TextField
                  label="Primary Contact User ID"
                  value={config.primaryContactUserId || ''}
                  onChange={(val) => updateConfig('primaryContactUserId', val)}
                  placeholder="User ID or email"
                  helpText="Specific compliance officer to assign"
                />
                <TextField
                  label="Backup Contact User ID"
                  value={config.backupContactUserId || ''}
                  onChange={(val) => updateConfig('backupContactUserId', val)}
                  placeholder="User ID or email"
                  helpText="Backup if primary is unavailable"
                />
              </>
            )}

            <NumberField
              label="SLA (Hours)"
              value={config.slaHours || 4}
              onChange={(val) => updateConfig('slaHours', val)}
              min={1}
              max={48}
              helpText="Compliance must respond within this time"
            />

            <CheckboxField
              label="Auto-Escalate to MLRO"
              checked={autoEscalateToMLRO}
              onChange={(val) => updateConfig('autoEscalateToMLRO', val)}
              helpText="⚠️ Escalate to Money Laundering Reporting Officer if not resolved"
            />

            {autoEscalateToMLRO && (
              <NumberField
                label="Escalate to MLRO After (Hours)"
                value={config.escalateToMLROAfterHours || 8}
                onChange={(val) => updateConfig('escalateToMLROAfterHours', val)}
                min={1}
                max={168}
                helpText="Maximum 168 hours (1 week)"
              />
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Customer Impact */}
      <AccordionItem value="impact">
        <AccordionTrigger className="text-base font-semibold">
          Customer Impact
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Block All Transactions"
              checked={blockAllTransactions}
              onChange={(val) => updateConfig('blockAllTransactions', val)}
              helpText="⚠️ Immediately block all pending and new transactions"
            />

            <CheckboxField
              label="Freeze Account"
              checked={freezeAccount}
              onChange={(val) => updateConfig('freezeAccount', val)}
              helpText="⚠️ Complete account freeze (no login, no transactions)"
            />

            <CheckboxField
              label="Notify Customer"
              checked={notifyCustomer}
              onChange={(val) => updateConfig('notifyCustomer', val)}
              helpText="Send notification to customer about escalation (usually NO for compliance)"
            />

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* External Reporting */}
      <AccordionItem value="reporting">
        <AccordionTrigger className="text-base font-semibold">
          External Reporting
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="External Reporting Required"
              checked={externalReportingRequired}
              onChange={(val) => updateConfig('externalReportingRequired', val)}
              helpText="⚠️ Must file report with regulatory authorities (SAR/STR/etc)"
            />

            {externalReportingRequired && (
              <div className="pl-6 space-y-3 border-l-2 border-destructive/30">
                <p className="text-xs text-muted-foreground mb-2">
                  Select applicable reporting types:
                </p>
                
                <CheckboxField
                  label="FinCEN SAR (Suspicious Activity Report - US)"
                  checked={config.externalReportingTypes?.includes('FINCEN_SAR') === true}
                  onChange={(val) => {
                    const types = config.externalReportingTypes || [];
                    updateConfig('externalReportingTypes', val 
                      ? [...types, 'FINCEN_SAR']
                      : types.filter(t => t !== 'FINCEN_SAR')
                    );
                  }}
                />

                <CheckboxField
                  label="FIU STR (Suspicious Transaction Report - International)"
                  checked={config.externalReportingTypes?.includes('FIU_STR') === true}
                  onChange={(val) => {
                    const types = config.externalReportingTypes || [];
                    updateConfig('externalReportingTypes', val 
                      ? [...types, 'FIU_STR']
                      : types.filter(t => t !== 'FIU_STR')
                    );
                  }}
                />

                <CheckboxField
                  label="Sanctions Report (OFAC/EU/UN)"
                  checked={config.externalReportingTypes?.includes('SANCTIONS_REPORT') === true}
                  onChange={(val) => {
                    const types = config.externalReportingTypes || [];
                    updateConfig('externalReportingTypes', val 
                      ? [...types, 'SANCTIONS_REPORT']
                      : types.filter(t => t !== 'SANCTIONS_REPORT')
                    );
                  }}
                />

                <CheckboxField
                  label="Other Regulatory Report"
                  checked={config.externalReportingTypes?.includes('OTHER') === true}
                  onChange={(val) => {
                    const types = config.externalReportingTypes || [];
                    updateConfig('externalReportingTypes', val 
                      ? [...types, 'OTHER']
                      : types.filter(t => t !== 'OTHER')
                    );
                  }}
                />
              </div>
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Case Management */}
      <AccordionItem value="case">
        <AccordionTrigger className="text-base font-semibold">
          Case Management
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Create Case"
              checked={createCase}
              onChange={(val) => updateConfig('createCase', val)}
              helpText="Create compliance case for tracking"
            />

            {createCase && (
              <>
                <SelectField
                  label="Case Type"
                  value={caseType}
                  onChange={(val) => updateConfig('caseType', val)}
                  options={[
                    { value: 'INVESTIGATION', label: 'Investigation' },
                    { value: 'REVIEW', label: 'Review' },
                    { value: 'INCIDENT', label: 'Incident' },
                    { value: 'REPORT', label: 'Report' },
                  ]}
                />

                <TextField
                  label="Related Case IDs"
                  value={config.relatedCaseIds?.join(', ') || ''}
                  onChange={(val) => updateConfig('relatedCaseIds', val ? val.split(',').map(s => s.trim()) : [])}
                  placeholder="case-123, case-456"
                  helpText="Comma-separated IDs of related compliance cases"
                />

                <CheckboxField
                  label="Track Time"
                  checked={trackTime}
                  onChange={(val) => updateConfig('trackTime', val)}
                  helpText="Track time spent on this case for reporting"
                />
              </>
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

