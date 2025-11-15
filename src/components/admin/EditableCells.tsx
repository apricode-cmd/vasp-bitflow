/**
 * Editable Cell Components for DataTableAdvanced
 * 
 * Usage in column definition:
 * {
 *   accessorKey: 'firstName',
 *   header: 'First Name',
 *   cell: EditableTextCell
 * }
 */

'use client';

import { useState, useEffect } from 'react';
import type { CellContext } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Editable Text Cell
 * 
 * Auto-saves on blur
 */
export function EditableTextCell<TData>({
  getValue,
  row: { index },
  column: { id },
  table,
}: CellContext<TData, unknown>) {
  const initialValue = getValue() as string;
  const [value, setValue] = useState(initialValue);

  const onBlur = () => {
    table.options.meta?.updateData?.(index, id, value);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      value={value || ''}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      className="h-8 w-full border-0 bg-transparent p-1 focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="editable-text-input"
    />
  );
}

/**
 * Create Editable Select Cell with custom options
 * 
 * @param options - Array of {label, value} options
 * 
 * @example
 * {
 *   accessorKey: 'status',
 *   header: 'Status',
 *   cell: createEditableSelectCell([
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' },
 *   ])
 * }
 */
export function createEditableSelectCell<TData>(
  options: { label: string; value: string }[]
) {
  return function EditableSelectCell({
    getValue,
    row: { index },
    column: { id },
    table,
  }: CellContext<TData, unknown>) {
    const initialValue = getValue() as string;

    const handleValueChange = (newValue: string) => {
      table.options.meta?.updateData?.(index, id, newValue);
    };

    return (
      <Select value={initialValue} onValueChange={handleValueChange}>
        <SelectTrigger
          className="h-8 w-full border-0 bg-transparent p-1 focus:ring-1 focus:ring-ring"
          aria-label={`select-${id}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
}

/**
 * Editable Number Cell
 * 
 * Auto-saves on blur, supports min/max/step
 */
export function createEditableNumberCell<TData>(config?: {
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return function EditableNumberCell({
    getValue,
    row: { index },
    column: { id },
    table,
  }: CellContext<TData, unknown>) {
    const initialValue = getValue() as number;
    const [value, setValue] = useState(initialValue.toString());

    const onBlur = () => {
      const numValue = parseFloat(value);
      let finalValue = isNaN(numValue) ? initialValue : numValue;

      // Apply min/max clamping
      if (config?.min !== undefined && finalValue < config.min) {
        finalValue = config.min;
      }
      if (config?.max !== undefined && finalValue > config.max) {
        finalValue = config.max;
      }

      table.options.meta?.updateData?.(index, id, finalValue);
    };

    useEffect(() => {
      setValue(initialValue.toString());
    }, [initialValue]);

    return (
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min={config?.min}
          max={config?.max}
          step={config?.step}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          className="h-8 w-20 border-0 bg-transparent p-1 focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="editable-number-input"
        />
        {config?.suffix && (
          <span className="text-sm text-muted-foreground">{config.suffix}</span>
        )}
      </div>
    );
  };
}

