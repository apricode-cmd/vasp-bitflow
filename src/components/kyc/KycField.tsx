/**
 * KycField - Universal field renderer
 * Handles all field types: text, email, select, date, country, phone, textarea, etc.
 */
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { PhoneInput } from '@/components/ui/phone-input';
import { KycField as KycFieldType } from '@/lib/kyc/config';
import type { Value as PhoneValue } from 'react-phone-number-input';

interface Props {
  field: KycFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function KycField({ field, value, onChange, error }: Props) {
  // Check if field is nationality/citizenship (should use country dropdown)
  const isNationalityField = field.fieldName.toLowerCase().includes('nationality') || 
                             field.fieldName.toLowerCase().includes('citizenship');
  
  // Check if field is date of birth (needs age validation)
  const isDateOfBirth = field.fieldName.toLowerCase().includes('birth') || 
                        field.fieldName.toLowerCase().includes('dob');

  const renderInput = () => {
    // Special handling for nationality/citizenship fields
    if (isNationalityField || field.fieldType === 'country') {
      return (
        <CountryDropdown
          value={value || ''}
          onChange={onChange}
        />
      );
    }

    switch (field.fieldType) {
      case 'text':
      case 'email':
        return (
          <Input
            type={field.fieldType}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
            className={error ? 'border-destructive' : ''}
          />
        );

      case 'select':
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        // For date of birth, set max date to 18 years ago
        const maxDate = isDateOfBirth ? new Date(
          new Date().setFullYear(new Date().getFullYear() - 18)
        ) : undefined;
        
        return (
          <DatePicker
            date={value ? new Date(value) : undefined}
            onDateChange={(date) => onChange(date?.toISOString())}
            maxDate={maxDate}
          />
        );

      case 'country':
        return (
          <CountryDropdown
            value={value || ''}
            onChange={onChange}
          />
        );

      case 'phone':
        return (
          <PhoneInput
            value={value as PhoneValue}
            onChange={onChange}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={field.label}
            className={error ? 'border-destructive' : ''}
          />
        );

      case 'month':
        return (
          <Input
            type="month"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="YYYY-MM"
            className={error ? 'border-destructive' : ''}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
            className={error ? 'border-destructive' : ''}
          />
        );

      default:
        // Fallback to text input
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
            className={error ? 'border-destructive' : ''}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

