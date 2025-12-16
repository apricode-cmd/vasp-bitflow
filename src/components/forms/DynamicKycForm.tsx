/**
 * Dynamic KYC Form Component
 * 
 * Modern KYC form with shadcn/ui components
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { CountryDropdown, type Country } from '@/components/ui/country-dropdown';
import { DatePicker } from '@/components/ui/date-picker';
import { FileUpload } from '@/components/forms/FileUpload';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, MapPin, FileText, Shield, Briefcase, 
  Target, DollarSign, CheckSquare, Loader2 
} from 'lucide-react';
import type { Value as PhoneValue } from 'react-phone-number-input';

interface KycField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  category: string;
  validation: any;
  options: any;
}

interface DynamicKycFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
}

const CATEGORY_CONFIG = {
  personal: {
    title: 'Personal Information',
    description: 'Your basic personal details',
    icon: User
  },
  contact: {
    title: 'Contact Information',
    description: 'How we can reach you',
    icon: User
  },
  address: {
    title: 'Address Information',
    description: 'Your residential address',
    icon: MapPin
  },
  documents: {
    title: 'Identity Documents',
    description: 'Upload required identity documents',
    icon: FileText
  },
  pep_sanctions: {
    title: 'PEP & Sanctions',
    description: 'Political exposure and sanctions screening',
    icon: Shield
  },
  employment: {
    title: 'Employment Information',
    description: 'Your employment and occupation details',
    icon: Briefcase
  },
  purpose: {
    title: 'Purpose & Intended Use',
    description: 'Account purpose and usage information',
    icon: Target
  },
  activity: {
    title: 'Expected Activity',
    description: 'Expected transaction volume and frequency',
    icon: Target
  },
  funds: {
    title: 'Source of Funds',
    description: 'Origin of your funds and wealth',
    icon: DollarSign
  },
  consents: {
    title: 'Consents & Compliance',
    description: 'Required agreements and confirmations',
    icon: CheckSquare
  }
};

export function DynamicKycForm({ onSubmit, initialData = {} }: DynamicKycFormProps): JSX.Element {
  const [fields, setFields] = useState<Record<string, KycField[]>>({});
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async (): Promise<void> => {
    try {
      const response = await fetch('/api/kyc/form-fields');
      const data = await response.json();

      if (data.success && data.grouped) {
        setFields(data.grouped);
      } else {
        toast.error('Failed to load form fields');
      }
    } catch (error) {
      console.error('Fetch fields error:', error);
      toast.error('Failed to load form fields');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: any): void => {
    setFormData({
      ...formData,
      [fieldName]: value
    });
  };

  const handleFileSelect = (fieldName: string, file: File): void => {
    setDocuments({
      ...documents,
      [fieldName]: file
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload documents first if any
      if (Object.keys(documents).length > 0) {
        const documentUploadPromises = Object.entries(documents).map(async ([fieldName, file]) => {
          const formDataObj = new FormData();
          formDataObj.append('file', file);
          formDataObj.append('documentType', fieldName);

          const response = await fetch('/api/kyc/upload-document', {
            method: 'POST',
            body: formDataObj
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${fieldName}`);
          }

          return response.json();
        });

        await Promise.all(documentUploadPromises);
      }

      // Submit form data
      await onSubmit(formData);

    } catch (error: any) {
      console.error('Submit form error:', error);
      toast.error(error.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: KycField): JSX.Element => {
    const value = formData[field.fieldName] || '';

    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('[KYC Form] Rendering field:', field.fieldName, 'Type:', field.fieldType, 'Options:', field.options);
    }

    try {
      switch (field.fieldType) {
      case 'text':
      case 'email':
        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type={field.fieldType}
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type="number"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <DatePicker
              date={value ? new Date(value) : undefined}
              onDateChange={(date) => {
                if (date) {
                  // ✅ FIX: Use local date instead of UTC to prevent "1 day less" bug
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  handleInputChange(field.fieldName, `${year}-${month}-${day}`);
                } else {
                  handleInputChange(field.fieldName, '');
                }
              }}
              placeholder={`Select ${field.label.toLowerCase()}`}
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
          </div>
        );

      case 'phone':
        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <PhoneInput
              value={value as PhoneValue}
              onChange={(val) => handleInputChange(field.fieldName, val)}
              defaultCountry="PL"
              placeholder="Enter phone number"
            />
          </div>
        );

      case 'country':
        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <CountryDropdown
              defaultValue={value}
              onChange={(country: Country) => handleInputChange(field.fieldName, country.alpha2)}
              placeholder="Select country"
            />
          </div>
        );

      case 'select':
        // Parse options - могут быть массивом, объектом, строкой JSON, или null/undefined
        let options: string[] = [];
        if (field.options) {
          try {
            // Если это строка - парсим как JSON
            if (typeof field.options === 'string') {
              const parsed = JSON.parse(field.options);
              options = Array.isArray(parsed) ? parsed : Object.values(parsed);
            }
            // Если массив - используем напрямую
            else if (Array.isArray(field.options)) {
              options = field.options;
            }
            // Если объект - берём values
            else if (typeof field.options === 'object') {
              options = Object.values(field.options);
            }
          } catch (e) {
            console.error('[KYC Form] Failed to parse options for', field.fieldName, ':', e);
          }
        }

        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <Select 
              value={value} 
              onValueChange={(val) => handleInputChange(field.fieldName, val)}
              required={field.isRequired}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.length > 0 ? (
                  options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {String(option).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No options available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.fieldName} className="space-y-2">
            <Label htmlFor={field.fieldName}>
              {field.label} {field.isRequired && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.fieldName}
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              rows={4}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.fieldName} className="flex items-start space-x-3 py-2">
            <Checkbox
              id={field.fieldName}
              checked={value === true || value === 'yes'}
              onCheckedChange={(checked) => handleInputChange(field.fieldName, checked)}
              required={field.isRequired}
            />
            <div className="space-y-1">
              <Label 
                htmlFor={field.fieldName}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.label} {field.isRequired && <span className="text-destructive">*</span>}
              </Label>
            </div>
          </div>
        );

      case 'file':
        return (
          <div key={field.fieldName} className="space-y-2">
            <FileUpload
              label={field.label + (field.isRequired ? ' *' : '')}
              accept="image/*,.pdf"
              currentFile={documents[field.fieldName]}
              onFileSelect={(file) => handleFileSelect(field.fieldName, file)}
              onFileRemove={() => {
                const newDocs = { ...documents };
                delete newDocs[field.fieldName];
                setDocuments(newDocs);
              }}
            />
          </div>
        );

      default:
        return (
          <div key={field.fieldName} className="text-sm text-muted-foreground">
            Unsupported field type: {field.fieldType}
          </div>
        );
    }
    } catch (error) {
      console.error('[KYC Form] Error rendering field:', field.fieldName, error);
      return (
        <div key={field.fieldName} className="text-sm text-destructive">
          Error rendering field: {field.label} ({field.fieldName})
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const categoryKeys = Object.keys(fields).sort();
  const fieldCount = Object.values(fields).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">KYC Verification Form</h3>
            <p className="text-sm text-muted-foreground">
              Complete all required fields marked with *
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
        </Badge>
      </div>

      {/* Form sections */}
      {categoryKeys.map((category) => {
        const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
        const Icon = config?.icon || FileText;
        const fieldsInCategory = fields[category] || [];

        if (fieldsInCategory.length === 0) return null;

        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {config?.title || category}
                  </CardTitle>
                  <CardDescription>
                    {config?.description || `Provide ${category} information`}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {fieldsInCategory.length} {fieldsInCategory.length === 1 ? 'field' : 'fields'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={category === 'consents' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
                {fieldsInCategory.map(renderField)}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Separator />

      {/* Submit button */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting} size="lg" className="min-w-[200px]">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4 mr-2" />
              Submit KYC Application
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
