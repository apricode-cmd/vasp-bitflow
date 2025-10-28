/**
 * Resource Form Modal
 * 
 * Universal create/edit modal for CRM resources
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'array';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  fields: Field[];
  apiEndpoint: string;
  initialData?: Record<string, any>;
  isEdit?: boolean;
}

export function ResourceFormModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  fields,
  apiEndpoint,
  initialData,
  isEdit = false
}: ResourceFormModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully ${isEdit ? 'updated' : 'created'}`);
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Form submit error:', error);
      toast.error('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (name: string, value: any): void => {
    setFormData({ ...formData, [name]: value });
  };

  const renderField = (field: Field): JSX.Element => {
    const value = formData[field.name] ?? '';

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              disabled={field.disabled}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium">{field.label}</label>
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              disabled={field.disabled}
              className="w-full border rounded-md px-3 py-2 mt-1"
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name}>
            <label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={field.disabled}
              rows={4}
              className="w-full border rounded-md px-3 py-2 mt-1"
            />
          </div>
        );

      case 'array':
        return (
          <div key={field.name}>
            <label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <Input
              value={Array.isArray(value) ? value.join(', ') : value}
              onChange={(e) => handleChange(field.name, e.target.value.split(',').map(v => v.trim()))}
              placeholder={field.placeholder || 'Comma separated values'}
              disabled={field.disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Separate values with commas</p>
          </div>
        );

      case 'json':
        return (
          <div key={field.name}>
            <label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
              onChange={(e) => {
                try {
                  handleChange(field.name, JSON.parse(e.target.value));
                } catch {
                  handleChange(field.name, e.target.value);
                }
              }}
              placeholder={field.placeholder || '{}'}
              disabled={field.disabled}
              rows={6}
              className="w-full border rounded-md px-3 py-2 mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Valid JSON format</p>
          </div>
        );

      default:
        return (
          <div key={field.name}>
            <label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <Input
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={field.disabled}
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{isEdit ? 'Edit' : 'Create new'} record</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(renderField)}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}




