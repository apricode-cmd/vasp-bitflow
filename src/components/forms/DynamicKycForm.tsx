/**
 * Dynamic KYC Form Component
 * 
 * Renders KYC form based on configured fields
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/forms/FileUpload';
import { toast } from 'sonner';

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

      if (data.success) {
        setFields(data.data);
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
      // Upload documents first
      const documentUploadPromises = Object.entries(documents).map(async ([fieldName, file]) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', fieldName);

        const response = await fetch('/api/kyc/upload-document', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${fieldName}`);
        }

        return response.json();
      });

      await Promise.all(documentUploadPromises);

      // Submit form data
      await onSubmit(formData);

      toast.success('KYC form submitted successfully');
    } catch (error: any) {
      console.error('Submit form error:', error);
      toast.error(error.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: KycField): JSX.Element => {
    const value = formData[field.fieldName] || '';

    switch (field.fieldType) {
      case 'text':
      case 'number':
        return (
          <div key={field.fieldName}>
            <label className="text-sm font-medium">
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <Input
              type={field.fieldType}
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.isRequired}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.fieldName}>
            <label className="text-sm font-medium">
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.isRequired}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.fieldName}>
            <label className="text-sm font-medium">
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={value}
              onChange={(e) => handleInputChange(field.fieldName, e.target.value)}
              required={field.isRequired}
            >
              <option value="">Select...</option>
              {field.options && Object.entries(field.options).map(([key, label]) => (
                <option key={key} value={key}>
                  {label as string}
                </option>
              ))}
            </select>
          </div>
        );

      case 'file':
        return (
          <div key={field.fieldName}>
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
        return <div key={field.fieldName}>Unsupported field type: {field.fieldType}</div>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        Loading form...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      {fields.personal && fields.personal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Provide your personal details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.personal.map(renderField)}
          </CardContent>
        </Card>
      )}

      {/* Address Information */}
      {fields.address && fields.address.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
            <CardDescription>Provide your residential address</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.address.map(renderField)}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {fields.documents && fields.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Identity Documents</CardTitle>
            <CardDescription>Upload required identity documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.documents.map(renderField)}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? 'Submitting...' : 'Submit KYC Application'}
        </Button>
      </div>
    </form>
  );
}

