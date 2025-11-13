/**
 * KycField - Universal field renderer
 * Handles all field types: text, email, select, date, country, phone, textarea, file, etc.
 */
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { KycField as KycFieldType } from '@/lib/kyc/config';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Value as PhoneValue } from 'react-phone-number-input';

interface Props {
  field: KycFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  formData?: Record<string, any>; // For accessing other form fields (e.g. country, nationality)
}

export function KycField({ field, value, onChange, error, formData = {} }: Props) {
  // Check if field is country-related (should use country dropdown)
  const isCountryField = field.fieldType === 'country' ||
                         field.fieldName.toLowerCase().includes('nationality') || 
                         field.fieldName.toLowerCase().includes('citizenship') ||
                         field.fieldName.toLowerCase().includes('_country') ||
                         field.fieldName.toLowerCase() === 'country';
  
  // Check if field is date of birth (needs age validation)
  const isDateOfBirth = field.fieldName.toLowerCase().includes('birth') || 
                        field.fieldName.toLowerCase().includes('dob');

  const renderInput = () => {
    // Special handling for country fields
    if (isCountryField) {
      return (
        <CountryDropdown
          defaultValue={value}
          onChange={(country) => onChange(country.alpha3)}
          placeholder={`Select ${field.label}`}
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
        // Parse options - can be JSON string, array, or null
        let options: string[] = [];
        if (Array.isArray(field.options)) {
          options = field.options;
        } else if (field.options && typeof field.options === 'string') {
          try {
            const parsed = JSON.parse(field.options);
            options = Array.isArray(parsed) ? parsed : [];
          } catch {
            console.warn(`Failed to parse options for ${field.fieldName}:`, field.options);
            options = [];
          }
        } else if (field.options && typeof field.options === 'object') {
          // Prisma Json type returns as object
          options = Object.values(field.options).filter(v => typeof v === 'string');
        }
        
        // Debug log
        if (options.length === 0) {
          console.warn(`⚠️ No options for select field: ${field.fieldName}`, {
            rawOptions: field.options,
            type: typeof field.options
          });
        }

        return (
          <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No options available
                </div>
              ) : (
                options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))
              )}
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
            defaultValue={value}
            onChange={(country) => onChange(country.alpha3)}
            placeholder={`Select ${field.label}`}
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

      case 'file':
        return <FileUploadField field={field} value={value} onChange={onChange} error={error} formData={formData} />;

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

/**
 * FileUploadField - File upload with preview and upload to KYC provider
 */
function FileUploadField({ field, value, onChange, error, formData = {} }: {
  field: KycFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  formData?: Record<string, any>;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(value);

  const handleFileSelect = async (file: File) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and PDF are allowed');
      return;
    }

    setUploading(true);

    try {
      // Prepare FormData for upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      // Map field name to document type
      let documentType = 'SELFIE';
      let documentSubType = null;
      
      if (field.fieldName.includes('passport')) {
        documentType = 'PASSPORT';
      } else if (field.fieldName.includes('id_scan_front') || field.fieldName.includes('id_front')) {
        documentType = 'ID_CARD';
        documentSubType = 'FRONT_SIDE';
      } else if (field.fieldName.includes('id_scan_back') || field.fieldName.includes('id_back')) {
        documentType = 'ID_CARD';
        documentSubType = 'BACK_SIDE';
      } else if (field.fieldName.includes('proof_of_address') || field.fieldName.includes('utility_bill')) {
        documentType = 'UTILITY_BILL';
      } else if (field.fieldName.includes('selfie') || field.fieldName.includes('liveness')) {
        documentType = 'SELFIE';
      }
      
      uploadFormData.append('documentType', documentType);
      
      // Get country from form data (try nationality first, then country)
      const country = formData?.nationality || formData?.country || formData?.residence_country || formData?.country_of_residence || 'POL';
      uploadFormData.append('country', country);
      
      if (documentSubType) {
        uploadFormData.append('documentSubType', documentSubType);
      }
      
      // Add document number if available in form
      if (documentType === 'PASSPORT' && formData?.passport_number) {
        uploadFormData.append('number', formData.passport_number);
      } else if (documentType === 'ID_CARD' && formData?.id_number) {
        uploadFormData.append('number', formData.id_number);
      }

      console.log('📤 Uploading file:', {
        fieldName: field.fieldName,
        documentType,
        documentSubType,
        country,
        fileName: file.name
      });

      // Upload to API
      const response = await fetch('/api/kyc/upload-document', {
        method: 'POST',
        body: uploadFormData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('✅ Upload successful:', result);

      // Update state
      const fileData = {
        fileName: file.name,
        fileSize: file.size,
        documentId: result.data.documentId,
        providerDocumentId: result.data.providerDocumentId,
        status: 'success',
        warnings: result.data.warnings || []
      };

      setUploadedFile(fileData);
      onChange(fileData); // Save to form state

      toast.success(`${field.label} uploaded successfully!`);

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    onChange(null);
  };

  // Already uploaded
  if (uploadedFile && uploadedFile.status === 'success') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-950/30 rounded-lg border border-green-200">
          <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-900 dark:text-green-100 flex-1 truncate">
            {uploadedFile.fileName}
          </span>
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        </div>
        
        {uploadedFile.warnings && uploadedFile.warnings.length > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200">
            ⚠️ {uploadedFile.warnings.join(', ')}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleRemove}
        >
          <Upload className="h-3 w-3 mr-1" />
          Re-upload
        </Button>
      </div>
    );
  }

  // Upload UI
  return (
    <div className="space-y-2">
      <div className={`group relative flex items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
        error 
          ? 'border-destructive bg-destructive/5' 
          : 'border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-sm'
      } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
        <label htmlFor={`file-${field.fieldName}`} className="cursor-pointer text-center w-full">
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Uploading to verification system...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait</p>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative rounded-xl bg-primary/10 p-3 mx-auto w-fit">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="text-sm font-medium mb-1">
                Drop file here or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPEG, PNG, PDF • Max 10MB
              </p>
            </>
          )}
        </label>
        <Input
          id={`file-${field.fieldName}`}
          type="file"
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(file);
            }
          }}
        />
      </div>
    </div>
  );
}

