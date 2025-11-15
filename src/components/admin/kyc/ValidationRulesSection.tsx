/**
 * Validation Rules Section Component
 * Visual UI for building field validation rules
 */

'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Info, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ValidationRule {
  id: string;
  type: 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: any;
  message?: string;
}

interface ValidationRulesSectionProps {
  fieldType: string;
  validation: any;
  onChange: (validation: any) => void;
}

const RULE_TYPES = {
  text: [
    { value: 'minLength', label: 'Min Length', description: 'Minimum number of characters' },
    { value: 'maxLength', label: 'Max Length', description: 'Maximum number of characters' },
    { value: 'pattern', label: 'Regex Pattern', description: 'Custom regex validation' },
    { value: 'email', label: 'Email Format', description: 'Valid email address' },
    { value: 'url', label: 'URL Format', description: 'Valid URL' },
  ],
  number: [
    { value: 'min', label: 'Min Value', description: 'Minimum number value' },
    { value: 'max', label: 'Max Value', description: 'Maximum number value' },
  ],
  textarea: [
    { value: 'minLength', label: 'Min Length', description: 'Minimum number of characters' },
    { value: 'maxLength', label: 'Max Length', description: 'Maximum number of characters' },
  ],
  date: [
    { value: 'min', label: 'Min Date', description: 'Earliest allowed date' },
    { value: 'max', label: 'Max Date', description: 'Latest allowed date' },
  ],
};

const COMMON_PATTERNS = [
  { value: '^[A-Z]{2}$', label: 'Two uppercase letters', example: 'US, UK' },
  { value: '^[0-9]{6}$', label: '6-digit number', example: '123456' },
  { value: '^[A-Za-z\\s]+$', label: 'Letters and spaces only', example: 'John Doe' },
  { value: '^[+]?[0-9\\s\\-()]+$', label: 'Phone number', example: '+1 234-567-8900' },
  { value: '^[A-Z0-9]{8,12}$', label: 'Alphanumeric 8-12 chars', example: 'ABC12345' },
];

export function ValidationRulesSection({
  fieldType,
  validation,
  onChange
}: ValidationRulesSectionProps) {
  const [rules, setRules] = useState<ValidationRule[]>(() => {
    if (!validation) return [];
    
    // Parse existing validation object to rules array
    const parsed: ValidationRule[] = [];
    if (validation.minLength) parsed.push({ id: 'minLength', type: 'minLength', value: validation.minLength, message: validation.minLengthMessage });
    if (validation.maxLength) parsed.push({ id: 'maxLength', type: 'maxLength', value: validation.maxLength, message: validation.maxLengthMessage });
    if (validation.min) parsed.push({ id: 'min', type: 'min', value: validation.min, message: validation.minMessage });
    if (validation.max) parsed.push({ id: 'max', type: 'max', value: validation.max, message: validation.maxMessage });
    if (validation.pattern) parsed.push({ id: 'pattern', type: 'pattern', value: validation.pattern, message: validation.patternMessage });
    if (validation.email) parsed.push({ id: 'email', type: 'email', message: validation.emailMessage });
    if (validation.url) parsed.push({ id: 'url', type: 'url', message: validation.urlMessage });
    
    return parsed;
  });

  const [addingRule, setAddingRule] = useState(false);
  const [newRuleType, setNewRuleType] = useState<string>('');

  const availableRuleTypes = RULE_TYPES[fieldType as keyof typeof RULE_TYPES] || RULE_TYPES.text;

  // Convert rules array to validation object
  const rulesToValidation = (rulesArray: ValidationRule[]) => {
    const validationObj: any = {};
    
    rulesArray.forEach(rule => {
      switch (rule.type) {
        case 'minLength':
          validationObj.minLength = rule.value;
          if (rule.message) validationObj.minLengthMessage = rule.message;
          break;
        case 'maxLength':
          validationObj.maxLength = rule.value;
          if (rule.message) validationObj.maxLengthMessage = rule.message;
          break;
        case 'min':
          validationObj.min = rule.value;
          if (rule.message) validationObj.minMessage = rule.message;
          break;
        case 'max':
          validationObj.max = rule.value;
          if (rule.message) validationObj.maxMessage = rule.message;
          break;
        case 'pattern':
          validationObj.pattern = rule.value;
          if (rule.message) validationObj.patternMessage = rule.message;
          break;
        case 'email':
          validationObj.email = true;
          if (rule.message) validationObj.emailMessage = rule.message;
          break;
        case 'url':
          validationObj.url = true;
          if (rule.message) validationObj.urlMessage = rule.message;
          break;
      }
    });
    
    return Object.keys(validationObj).length > 0 ? validationObj : null;
  };

  const handleAddRule = () => {
    if (!newRuleType) return;
    
    const ruleType = availableRuleTypes.find(r => r.value === newRuleType);
    if (!ruleType) return;

    const newRule: ValidationRule = {
      id: Date.now().toString(),
      type: newRuleType as any,
      value: ['email', 'url'].includes(newRuleType) ? undefined : '',
      message: ''
    };

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    onChange(rulesToValidation(updatedRules));
    setAddingRule(false);
    setNewRuleType('');
  };

  const handleUpdateRule = (id: string, field: 'value' | 'message', newValue: any) => {
    const updatedRules = rules.map(rule => 
      rule.id === id ? { ...rule, [field]: newValue } : rule
    );
    setRules(updatedRules);
    onChange(rulesToValidation(updatedRules));
  };

  const handleRemoveRule = (id: string) => {
    const updatedRules = rules.filter(rule => rule.id !== id);
    setRules(updatedRules);
    onChange(rulesToValidation(updatedRules));
  };

  const getRuleTypeInfo = (type: string) => {
    const allTypes = [...RULE_TYPES.text, ...RULE_TYPES.number, ...RULE_TYPES.date];
    return allTypes.find(r => r.value === type);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">Validation Rules</Label>
        <p className="text-sm text-muted-foreground">
          Build validation rules visually. Rules are checked when user submits the form.
        </p>
      </div>

      {/* Existing Rules */}
      {rules.length > 0 && (
        <div className="space-y-3">
          {rules.map((rule) => {
            const ruleInfo = getRuleTypeInfo(rule.type);
            
            return (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {ruleInfo?.label || rule.type}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {ruleInfo?.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRule(rule.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Value Input */}
                    {!['email', 'url'].includes(rule.type) && (
                      <div className="space-y-2">
                        <Label htmlFor={`value-${rule.id}`}>Value</Label>
                        {rule.type === 'pattern' ? (
                          <>
                            <Input
                              id={`value-${rule.id}`}
                              placeholder="^[A-Z0-9]+$"
                              value={rule.value || ''}
                              onChange={(e) => handleUpdateRule(rule.id, 'value', e.target.value)}
                              className="font-mono text-sm"
                            />
                            {/* Common Patterns Helper */}
                            <Select
                              value=""
                              onValueChange={(value) => handleUpdateRule(rule.id, 'value', value)}
                            >
                              <SelectTrigger className="text-xs">
                                <SelectValue placeholder="Or choose a common pattern..." />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_PATTERNS.map((pattern) => (
                                  <SelectItem key={pattern.value} value={pattern.value}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{pattern.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Example: {pattern.example}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <Input
                            id={`value-${rule.id}`}
                            type={['min', 'max'].includes(rule.type) ? 'number' : 'text'}
                            placeholder={
                              rule.type === 'minLength' ? '2' :
                              rule.type === 'maxLength' ? '100' :
                              rule.type === 'min' ? '0' :
                              rule.type === 'max' ? '999' :
                              'Value'
                            }
                            value={rule.value || ''}
                            onChange={(e) => handleUpdateRule(rule.id, 'value', 
                              ['min', 'max'].includes(rule.type) ? Number(e.target.value) : e.target.value
                            )}
                          />
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    <div className="space-y-2">
                      <Label htmlFor={`message-${rule.id}`}>
                        Error Message <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id={`message-${rule.id}`}
                        placeholder="Custom error message for users"
                        value={rule.message || ''}
                        onChange={(e) => handleUpdateRule(rule.id, 'message', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Rule Button/Form */}
      {!addingRule ? (
        <Button
          variant="outline"
          onClick={() => setAddingRule(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Validation Rule
        </Button>
      ) : (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="space-y-4">
              <Label>Select Rule Type</Label>
              <Select value={newRuleType} onValueChange={setNewRuleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose validation type..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRuleTypes.map((ruleType) => (
                    <SelectItem 
                      key={ruleType.value} 
                      value={ruleType.value}
                      disabled={rules.some(r => r.type === ruleType.value)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{ruleType.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {ruleType.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddRule}
                  disabled={!newRuleType}
                >
                  Add Rule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingRule(false);
                    setNewRuleType('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Alert */}
      {rules.length === 0 && !addingRule && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No validation rules configured. Add rules to validate user input on this field.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {rules.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Active Validation Rules:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {rules.map((rule) => {
                  const ruleInfo = getRuleTypeInfo(rule.type);
                  return (
                    <li key={rule.id}>
                      <strong>{ruleInfo?.label}:</strong>{' '}
                      {!['email', 'url'].includes(rule.type) && rule.value}{' '}
                      {rule.message && `(${rule.message})`}
                    </li>
                  );
                })}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Field Type Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Field Type:</strong> {fieldType}
          <br />
          Available validation rules are specific to this field type.
        </AlertDescription>
      </Alert>
    </div>
  );
}

