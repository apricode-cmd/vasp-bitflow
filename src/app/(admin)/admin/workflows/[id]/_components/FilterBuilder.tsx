'use client';

/**
 * Filter Builder Component
 * 
 * n8n-style filter builder for trigger configuration
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, X, Filter } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FilterRule, TriggerConfig } from '@/lib/validations/trigger-config';
import { getFieldsForTrigger, type TriggerType } from '@/lib/validations/trigger-config';

interface FilterBuilderProps {
  trigger: TriggerType;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

const OPERATORS = [
  { value: '==', label: 'Equals (==)', types: ['string', 'number', 'boolean', 'select'] },
  { value: '!=', label: 'Not Equals (!=)', types: ['string', 'number', 'boolean', 'select'] },
  { value: '>', label: 'Greater Than (>)', types: ['number'] },
  { value: '<', label: 'Less Than (<)', types: ['number'] },
  { value: '>=', label: 'Greater or Equal (>=)', types: ['number'] },
  { value: '<=', label: 'Less or Equal (<=)', types: ['number'] },
  { value: 'in', label: 'In Array (in)', types: ['string', 'select', 'multiselect'] },
  { value: 'not_in', label: 'Not In Array (not_in)', types: ['string', 'select', 'multiselect'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'not_contains', label: 'Not Contains', types: ['string'] },
  { value: 'starts_with', label: 'Starts With', types: ['string'] },
  { value: 'ends_with', label: 'Ends With', types: ['string'] },
  { value: 'matches', label: 'Regex Match', types: ['string'] },
  { value: 'between', label: 'Between', types: ['number'] },
];

export default function FilterBuilder({ trigger, config, onChange }: FilterBuilderProps) {
  const availableFields = getFieldsForTrigger(trigger);

  const handleAddFilter = () => {
    const newFilter: FilterRule = {
      field: '',
      operator: '==',
      value: '',
      logicOperator: 'OR',
    };

    onChange({
      ...config,
      filters: [...config.filters, newFilter],
    });
  };

  const handleRemoveFilter = (index: number) => {
    onChange({
      ...config,
      filters: config.filters.filter((_, i) => i !== index),
    });
  };

  const handleUpdateFilter = (index: number, updates: Partial<FilterRule>) => {
    const updated = config.filters.map((filter, i) =>
      i === index ? { ...filter, ...updates } : filter
    );
    onChange({
      ...config,
      filters: updated,
    });
  };

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({
      ...config,
      logic,
    });
  };

  // Group fields by category
  const groupedFields = availableFields.reduce((acc, field) => {
    const category = field.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {} as Record<string, typeof availableFields>);

  return (
    <div className="space-y-4">
      {/* Logic Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Run workflow when:</Label>
        <RadioGroup
          value={config.logic}
          onValueChange={(value) => handleLogicChange(value as 'AND' | 'OR')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="AND" id="logic-and" />
            <Label htmlFor="logic-and" className="text-sm font-normal cursor-pointer">
              ALL conditions match (AND)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="OR" id="logic-or" />
            <Label htmlFor="logic-or" className="text-sm font-normal cursor-pointer">
              ANY condition matches (OR)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Filters List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">
            Filters ({config.filters.length})
          </Label>
          {config.filters.length === 0 && (
            <Badge variant="secondary" className="text-xs">
              No filters = Always trigger
            </Badge>
          )}
        </div>

        {config.filters.map((filter, index) => {
          const fieldDef = availableFields.find((f) => f.value === filter.field);
          const allowedOperators = OPERATORS.filter((op) =>
            fieldDef ? op.types.includes(fieldDef.type) : true
          );

          return (
            <Card key={index} className="p-4 relative">
              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => handleRemoveFilter(index)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="space-y-3">
                {/* Logic Operator (for chaining) */}
                {index > 0 && (
                  <div>
                    <Select
                      value={filter.logicOperator || config.logic}
                      onValueChange={(value) =>
                        handleUpdateFilter(index, { logicOperator: value as 'AND' | 'OR' })
                      }
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Field Selector */}
                  <div>
                    <Label htmlFor={`field-${index}`} className="text-xs">
                      Field
                    </Label>
                    <Select
                      value={filter.field}
                      onValueChange={(value) => {
                        // Reset operator and value when field changes
                        const newFieldDef = availableFields.find((f) => f.value === value);
                        handleUpdateFilter(index, {
                          field: value,
                          operator: '==',
                          value: '',
                        });
                      }}
                    >
                      <SelectTrigger id={`field-${index}`} className="mt-1 text-xs">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedFields).map(([category, fields]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {fields.map((f) => (
                              <SelectItem key={f.value} value={f.value} className="text-xs">
                                {f.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operator Selector */}
                  <div>
                    <Label htmlFor={`operator-${index}`} className="text-xs">
                      Operator
                    </Label>
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => handleUpdateFilter(index, { operator: value })}
                    >
                      <SelectTrigger id={`operator-${index}`} className="mt-1 text-xs">
                        <SelectValue placeholder="Select operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedOperators.map((op) => (
                          <SelectItem key={op.value} value={op.value} className="text-xs">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value Input */}
                  <div>
                    <Label htmlFor={`value-${index}`} className="text-xs">
                      Value
                    </Label>
                    {fieldDef?.type === 'select' && fieldDef.options ? (
                      <Select
                        value={String(filter.value)}
                        onValueChange={(value) => handleUpdateFilter(index, { value })}
                      >
                        <SelectTrigger id={`value-${index}`} className="mt-1 text-xs">
                          <SelectValue placeholder="Select value..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldDef.options.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs">
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : fieldDef?.type === 'boolean' ? (
                      <Select
                        value={String(filter.value)}
                        onValueChange={(value) =>
                          handleUpdateFilter(index, { value: value === 'true' })
                        }
                      >
                        <SelectTrigger id={`value-${index}`} className="mt-1 text-xs">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true" className="text-xs">
                            True
                          </SelectItem>
                          <SelectItem value="false" className="text-xs">
                            False
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`value-${index}`}
                        type={fieldDef?.type === 'number' ? 'number' : 'text'}
                        value={filter.value}
                        onChange={(e) =>
                          handleUpdateFilter(index, {
                            value:
                              fieldDef?.type === 'number'
                                ? parseFloat(e.target.value)
                                : e.target.value,
                          })
                        }
                        placeholder={
                          ['in', 'not_in'].includes(filter.operator)
                            ? 'Comma-separated (e.g. RU,BY,KP)'
                            : 'Enter value...'
                        }
                        className="mt-1 text-xs"
                      />
                    )}
                    {['in', 'not_in'].includes(filter.operator) && !fieldDef?.options && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Enter comma-separated values
                      </p>
                    )}
                  </div>
                </div>

                {/* Field Description */}
                {fieldDef && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {fieldDef.type}
                    </Badge>
                    <span>{fieldDef.label}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {/* Add Filter Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddFilter}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter
        </Button>
      </div>

      {/* Preview */}
      {config.filters.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Filter Preview:</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {config.filters.map((filter, index) => {
              const fieldDef = availableFields.find((f) => f.value === filter.field);
              return (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {filter.logicOperator || config.logic}
                    </Badge>
                  )}
                  <code className="font-mono">
                    {fieldDef?.label || filter.field} {filter.operator}{' '}
                    {Array.isArray(filter.value)
                      ? `[${filter.value.join(', ')}]`
                      : String(filter.value)}
                  </code>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

