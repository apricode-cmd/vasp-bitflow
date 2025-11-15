/**
 * Conditional Logic Section Component
 * Visual UI for configuring field dependencies
 */

'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus, Info } from 'lucide-react';

interface ConditionalConfig {
  dependsOn: string | null;
  showWhen: {
    operator: '==' | '!=' | 'in' | 'not_in' | '>' | '<' | 'contains' | 'exists';
    value: any;
  } | null;
}

interface ConditionalLogicSectionProps {
  value: ConditionalConfig;
  onChange: (config: ConditionalConfig) => void;
  availableFields: Array<{ fieldName: string; label: string; fieldType: string }>;
  currentFieldName: string;
}

const OPERATORS = [
  { value: '==', label: 'equals (==)', description: 'Field equals specific value' },
  { value: '!=', label: 'not equals (!=)', description: 'Field does not equal value' },
  { value: 'in', label: 'in', description: 'Field is one of multiple values' },
  { value: 'not_in', label: 'not in', description: 'Field is not one of multiple values' },
  { value: '>', label: 'greater than (>)', description: 'Field is greater than value' },
  { value: '<', label: 'less than (<)', description: 'Field is less than value' },
  { value: 'contains', label: 'contains', description: 'Field contains text' },
  { value: 'exists', label: 'exists', description: 'Field has any value' },
];

export function ConditionalLogicSection({
  value,
  onChange,
  availableFields,
  currentFieldName
}: ConditionalLogicSectionProps) {
  const [isEnabled, setIsEnabled] = useState(!!value.dependsOn);

  // Filter out current field and fields that depend on this field (prevent circular dependencies)
  const validFields = availableFields.filter(f => 
    f.fieldName !== currentFieldName &&
    f.fieldName !== value.dependsOn // Could add more circular dependency checks
  );

  const handleEnable = () => {
    if (isEnabled) {
      onChange({ dependsOn: null, showWhen: null });
      setIsEnabled(false);
    } else {
      setIsEnabled(true);
    }
  };

  const handleDependsOnChange = (fieldName: string) => {
    onChange({
      dependsOn: fieldName,
      showWhen: value.showWhen || { operator: '==', value: '' }
    });
  };

  const handleOperatorChange = (operator: any) => {
    onChange({
      dependsOn: value.dependsOn,
      showWhen: {
        ...value.showWhen!,
        operator
      }
    });
  };

  const handleValueChange = (newValue: any) => {
    onChange({
      dependsOn: value.dependsOn,
      showWhen: {
        ...value.showWhen!,
        value: newValue
      }
    });
  };

  const handleClear = () => {
    onChange({ dependsOn: null, showWhen: null });
    setIsEnabled(false);
  };

  const selectedField = validFields.find(f => f.fieldName === value.dependsOn);
  const selectedOperator = OPERATORS.find(op => op.value === value.showWhen?.operator);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Conditional Logic</Label>
          <p className="text-sm text-muted-foreground">
            Show this field only when another field meets a condition
          </p>
        </div>
        <Button
          type="button"
          variant={isEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={handleEnable}
        >
          {isEnabled ? 'Enabled' : 'Enable'}
        </Button>
      </div>

      {isEnabled && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Depends On Field Selector */}
          <div className="space-y-2">
            <Label>Show this field when:</Label>
            <Select
              value={value.dependsOn || ''}
              onValueChange={handleDependsOnChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a field..." />
              </SelectTrigger>
              <SelectContent>
                {validFields.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No fields available
                  </div>
                ) : (
                  validFields.map(field => (
                    <SelectItem key={field.fieldName} value={field.fieldName}>
                      <div className="flex items-center gap-2">
                        <span>{field.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {field.fieldType}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {value.dependsOn && (
            <>
              {/* Operator Selector */}
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select
                  value={value.showWhen?.operator || '=='}
                  onValueChange={handleOperatorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{op.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {op.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Value Input */}
              {value.showWhen?.operator !== 'exists' && (
                <div className="space-y-2">
                  <Label>Value</Label>
                  {value.showWhen?.operator === 'in' || value.showWhen?.operator === 'not_in' ? (
                    <Input
                      placeholder="Enter comma-separated values (e.g., YES,MAYBE)"
                      value={Array.isArray(value.showWhen?.value) 
                        ? value.showWhen.value.join(',') 
                        : value.showWhen?.value || ''}
                      onChange={(e) => {
                        const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                        handleValueChange(values);
                      }}
                    />
                  ) : (
                    <Input
                      placeholder={`Enter value for ${selectedField?.label || 'field'}`}
                      value={value.showWhen?.value || ''}
                      onChange={(e) => handleValueChange(e.target.value)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selectedOperator?.description}
                  </p>
                </div>
              )}

              {/* Preview */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Preview:</strong> This field will be shown when{' '}
                  <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    {selectedField?.label || value.dependsOn}
                  </code>{' '}
                  <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    {value.showWhen?.operator}
                  </code>{' '}
                  {value.showWhen?.operator !== 'exists' && (
                    <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                      {Array.isArray(value.showWhen?.value)
                        ? `[${value.showWhen.value.join(', ')}]`
                        : value.showWhen?.value || '(empty)'}
                    </code>
                  )}
                </AlertDescription>
              </Alert>

              {/* Clear Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Conditional Logic
              </Button>
            </>
          )}
        </div>
      )}

      {/* Help Text */}
      {!isEnabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Enable conditional logic to show this field only when specific conditions are met.
            Example: Show "PEP Role" only when "PEP Status" is not "NO".
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

