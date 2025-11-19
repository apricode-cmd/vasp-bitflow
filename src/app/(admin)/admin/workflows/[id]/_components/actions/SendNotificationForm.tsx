/**
 * SEND_NOTIFICATION Action Form - Enterprise Level
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
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { SendNotificationConfig } from '@/lib/validations/workflow-actions';

interface SendNotificationFormProps {
  config: Partial<SendNotificationConfig>;
  onChange: (config: Partial<SendNotificationConfig>) => void;
  availableVariables: any[];
}

const CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'IN_APP', label: 'In-App Notification' },
  { value: 'SMS', label: 'SMS' },
  { value: 'SLACK', label: 'Slack' },
  { value: 'TELEGRAM', label: 'Telegram' },
];

export default function SendNotificationForm({
  config,
  onChange,
  availableVariables,
}: SendNotificationFormProps) {
  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const recipients = config.recipients || [{ type: 'ROLE', value: 'ADMIN', cc: false }];
  const channels = config.channels || ['EMAIL', 'IN_APP'];
  const priority = config.priority || 'NORMAL';
  const sendImmediately = config.sendImmediately !== false;

  const addRecipient = () => {
    updateConfig('recipients', [...recipients, { type: 'ROLE', value: 'ADMIN', cc: false }]);
  };

  const removeRecipient = (index: number) => {
    updateConfig('recipients', recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: string, value: any) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig('recipients', updated);
  };

  const toggleChannel = (channel: string) => {
    const updated = channels.includes(channel as any)
      ? channels.filter(c => c !== channel)
      : [...channels, channel as any];
    updateConfig('channels', updated);
  };

  return (
    <Accordion type="multiple" defaultValue={["recipients", "content"]} className="w-full">
      
      <AccordionItem value="recipients">
        <AccordionTrigger className="text-base font-semibold">
          Recipients
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Recipients *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRecipient}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {recipients.map((recipient, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <SelectField
                        label="Type"
                        value={recipient.type}
                        onChange={(val) => updateRecipient(index, 'type', val)}
                        options={[
                          { value: 'ROLE', label: 'Role' },
                          { value: 'USER', label: 'User ID' },
                          { value: 'EMAIL', label: 'Email' },
                        ]}
                      />
                      <TextField
                        label="Value"
                        value={recipient.value}
                        onChange={(val) => updateRecipient(index, 'value', val)}
                        placeholder={recipient.type === 'EMAIL' ? 'email@example.com' : 'value'}
                      />
                    </div>
                    {recipients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                        className="h-7 w-7 p-0 mt-5"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <CheckboxField
                    label="CC (carbon copy)"
                    checked={recipient.cc === true}
                    onChange={(val) => updateRecipient(index, 'cc', val)}
                  />
                </div>
              ))}
            </div>

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="channels">
        <AccordionTrigger className="text-base font-semibold">
          Notification Channels
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <div className="space-y-2">
              <Label className="text-xs font-medium">Channels *</Label>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((channel) => (
                  <div key={channel.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={channel.value}
                      checked={channels.includes(channel.value as any)}
                      onCheckedChange={() => toggleChannel(channel.value)}
                    />
                    <Label htmlFor={channel.value} className="text-xs cursor-pointer">
                      {channel.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="content">
        <AccordionTrigger className="text-base font-semibold">
          Message Content
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <TextField
              label="Template"
              value={config.template || ''}
              onChange={(val) => updateConfig('template', val)}
              placeholder="e.g., high_risk_alert"
            />

            <ExpressionField
              label="Subject"
              value={config.subject || ''}
              onChange={(val) => updateConfig('subject', val)}
              availableVariables={availableVariables}
              placeholder="e.g., Alert: High Risk Transaction {{ $node.orderId }}"
              required
            />

            <ExpressionField
              label="Message"
              value={config.message || ''}
              onChange={(val) => updateConfig('message', val)}
              availableVariables={availableVariables}
              placeholder="Full notification message..."
              rows={5}
              required
            />

            <SelectField
              label="Priority"
              value={priority}
              onChange={(val) => updateConfig('priority', val)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent 🚨' },
              ]}
            />

            <TextField
              label="Action Button Text"
              value={config.actionButton || ''}
              onChange={(val) => updateConfig('actionButton', val)}
              placeholder="e.g., Review Order"
            />

            {config.actionButton && (
              <ExpressionField
                label="Action Button Link"
                value={config.actionButtonLink || ''}
                onChange={(val) => updateConfig('actionButtonLink', val)}
                availableVariables={availableVariables}
                placeholder="e.g., /orders/{{ $node.orderId }}"
              />
            )}

          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="delivery">
        <AccordionTrigger className="text-base font-semibold">
          Delivery Options
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 py-2">
            
            <CheckboxField
              label="Send Immediately"
              checked={sendImmediately}
              onChange={(val) => updateConfig('sendImmediately', val)}
            />

            {!sendImmediately && (
              <NumberField
                label="Delay (Minutes)"
                value={config.delayMinutes || 0}
                onChange={(val) => updateConfig('delayMinutes', val)}
                min={0}
                max={1440}
              />
            )}

            <NumberField
              label="Retry on Failure"
              value={config.retryOnFailure || 3}
              onChange={(val) => updateConfig('retryOnFailure', val)}
              min={0}
              max={5}
              helpText="Number of retry attempts"
            />

            <CheckboxField
              label="Track Read Status"
              checked={config.trackReadStatus !== false}
              onChange={(val) => updateConfig('trackReadStatus', val)}
            />

          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

