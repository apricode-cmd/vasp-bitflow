/**
 * Resource Sheet Component
 * 
 * Sidebar for create/edit (modern UX - не блокирует таблицу)
 */

'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'array';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface ResourceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  fields: Field[];
  apiEndpoint: string;
  initialData?: Record<string, any>;
  isEdit?: boolean;
}

export function ResourceSheet({
  isOpen,
  onClose,
  onSuccess,
  title,
  fields = [],
  apiEndpoint,
  initialData,
  isEdit = false
}: ResourceSheetProps): JSX.Element {
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [submitting, setSubmitting] = useState(false);

  // Update formData when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({});
    }
  }, [initialData, isOpen]);

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
          <div key={field.name} className="flex items-center justify-between space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Switch
              id={field.name}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value === null || value === undefined ? 'NONE' : value}
              onValueChange={(val) => {
                // Convert 'NONE' to null for database
                const finalValue = val === 'NONE' ? null : val;
                handleChange(field.name, finalValue);
              }}
              required={field.required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {field.options && Array.isArray(field.options) && field.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          </div>
        );

      case 'array':
        return (
          <div key={field.name} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={Array.isArray(value) ? value.join(', ') : value}
              onChange={(e) => handleChange(field.name, e.target.value.split(',').map(v => v.trim()))}
              placeholder={field.placeholder || 'Comma separated'}
            />
            <p className="text-xs text-muted-foreground">Separate values with commas</p>
          </div>
        );

      case 'json':
        return (
          <div key={field.name} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
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
              rows={6}
              className="w-full border rounded-md px-3 py-2 bg-background font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Valid JSON format</p>
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{isEdit ? 'Edit' : 'Create new'} record</SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields && fields.length > 0 ? (
            fields.map(renderField)
          ) : (
            <p className="text-sm text-muted-foreground">No fields configured</p>
          )}

          <Separator className="my-4" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

