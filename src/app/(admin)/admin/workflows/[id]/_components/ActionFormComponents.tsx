/**
 * Reusable Form Components for Enterprise Action Configuration
 * 
 * Shared UI components used across all action forms
 */

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ExpressionInput from './ExpressionInput';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  helpText?: string;
  required?: boolean;
}

export function FormField({ label, children, helpText, required }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
}

export function SelectField({ 
  label, 
  value, 
  onChange, 
  options, 
  helpText, 
  required,
  placeholder = 'Select...' 
}: SelectFieldProps) {
  return (
    <FormField label={label} helpText={helpText} required={required}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  type?: 'text' | 'number' | 'email';
}

export function TextField({
  label,
  value,
  onChange,
  helpText,
  required,
  placeholder,
  type = 'text',
}: TextFieldProps) {
  return (
    <FormField label={label} helpText={helpText} required={required}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-xs"
      />
    </FormField>
  );
}

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

export function TextareaField({
  label,
  value,
  onChange,
  helpText,
  required,
  placeholder,
  rows = 4,
}: TextareaFieldProps) {
  return (
    <FormField label={label} helpText={helpText} required={required}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="text-xs"
      />
    </FormField>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helpText?: string;
}

export function CheckboxField({ label, checked, onChange, helpText }: CheckboxFieldProps) {
  return (
    <div className="flex items-start space-x-2">
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
      <div className="flex-1">
        <Label
          htmlFor={label}
          className="text-xs font-medium cursor-pointer"
        >
          {label}
        </Label>
        {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
      </div>
    </div>
  );
}

interface ExpressionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  availableVariables: any[];
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  isJson?: boolean;
  rows?: number;
}

export function ExpressionField({
  label,
  value,
  onChange,
  availableVariables,
  helpText,
  required,
  placeholder,
  isJson,
  rows,
}: ExpressionFieldProps) {
  return (
    <FormField label={label} helpText={helpText} required={required}>
      <ExpressionInput
        value={value}
        onChange={onChange}
        availableVariables={availableVariables}
        placeholder={placeholder}
        isJson={isJson}
        rows={rows}
      />
    </FormField>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  helpText,
  required,
  placeholder,
  min,
  max,
}: NumberFieldProps) {
  return (
    <FormField label={label} helpText={helpText} required={required}>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="text-xs"
      />
    </FormField>
  );
}

