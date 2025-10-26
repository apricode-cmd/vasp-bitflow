'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  MapPin,
  FileText,
  ShieldCheck,
  Briefcase,
  Target,
  DollarSign,
  CheckSquare,
  Edit,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface KycField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  category: string;
  isRequired: boolean;
  isEnabled: boolean;
  priority: number;
  validation: any;
  options: any;
  createdAt: string;
  updatedAt: string;
}

// Категории и иконки
const categoryIcons: Record<string, any> = {
  personal: User,
  contact: Mail,
  address: MapPin,
  documents: FileText,
  pep_sanctions: ShieldCheck,
  employment: Briefcase,
  purpose: Target,
  activity: Target,
  funds: DollarSign,
  consents: CheckSquare
};

const categoryNames: Record<string, string> = {
  personal: 'Personal Identification',
  contact: 'Contact Information',
  address: 'Residential Address',
  documents: 'Identity Documents',
  pep_sanctions: 'PEP & Sanctions',
  employment: 'Employment',
  purpose: 'Purpose of Account',
  activity: 'Expected Activity',
  funds: 'Source of Funds',
  consents: 'Consents & Compliance'
};

export default function KycFormFieldsPage() {
  const [fields, setFields] = useState<KycField[]>([]);
  const [grouped, setGrouped] = useState<Record<string, KycField[]>>({});
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<KycField | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    label: '',
    isRequired: false,
    isEnabled: true,
    priority: 0,
    validation: '',
    options: ''
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/kyc/form-fields');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFields(data.fields);
      setGrouped(data.grouped);
    } catch (error) {
      console.error('Failed to fetch KYC fields:', error);
      toast.error('Failed to load KYC form fields');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: KycField) => {
    setSelectedField(field);
    setEditForm({
      label: field.label,
      isRequired: field.isRequired,
      isEnabled: field.isEnabled,
      priority: field.priority,
      validation: field.validation ? JSON.stringify(field.validation, null, 2) : '',
      options: field.options ? JSON.stringify(field.options, null, 2) : ''
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedField) return;

    try {
      setSaving(true);

      // Parse JSON fields
      let validation = null;
      let options = null;

      if (editForm.validation.trim()) {
        try {
          validation = JSON.parse(editForm.validation);
        } catch (e) {
          toast.error('Invalid JSON in Validation field');
          return;
        }
      }

      if (editForm.options.trim()) {
        try {
          options = JSON.parse(editForm.options);
        } catch (e) {
          toast.error('Invalid JSON in Options field');
          return;
        }
      }

      const res = await fetch(`/api/admin/kyc/form-fields/${selectedField.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editForm.label,
          isRequired: editForm.isRequired,
          isEnabled: editForm.isEnabled,
          priority: editForm.priority,
          validation,
          options
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success('Field updated successfully');
      setEditDialog(false);
      fetchFields();
    } catch (error) {
      console.error('Failed to save field:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (field: KycField, toggleField: 'isRequired' | 'isEnabled') => {
    try {
      const res = await fetch(`/api/admin/kyc/form-fields/${field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [toggleField]: !field[toggleField]
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success(`Field ${toggleField === 'isRequired' ? 'required status' : 'enabled status'} updated`);
      fetchFields();
    } catch (error) {
      console.error('Failed to toggle field:', error);
      toast.error('Failed to update field');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">KYC Form Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure which fields are enabled, required, and their validation rules.
          Total: {fields.length} fields
        </p>
      </div>

      <Tabs defaultValue={categories[0] || 'personal'} className="space-y-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-auto">
            {categories.map((category) => {
              const Icon = categoryIcons[category] || FileText;
              return (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{categoryNames[category] || category}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        {categories.map((category) => {
          const Icon = categoryIcons[category] || FileText;
          const fieldsInCategory = grouped[category] || [];

          return (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {categoryNames[category] || category}
                  </CardTitle>
                  <CardDescription>
                    {fieldsInCategory.length} field(s) in this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fieldsInCategory.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.label}</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {field.fieldName}
                            </code>
                            <Badge variant="outline">{field.fieldType}</Badge>
                            {field.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {!field.isEnabled && (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Priority: {field.priority}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`required-${field.id}`} className="text-xs">
                              Required
                            </Label>
                            <Switch
                              id={`required-${field.id}`}
                              checked={field.isRequired}
                              onCheckedChange={() => handleQuickToggle(field, 'isRequired')}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label htmlFor={`enabled-${field.id}`} className="text-xs">
                              Enabled
                            </Label>
                            <Switch
                              id={`enabled-${field.id}`}
                              checked={field.isEnabled}
                              onCheckedChange={() => handleQuickToggle(field, 'isEnabled')}
                            />
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(field)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit KYC Field</DialogTitle>
            <DialogDescription>
              {selectedField && (
                <>
                  Editing <code className="font-mono">{selectedField.fieldName}</code>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={editForm.isRequired}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isRequired: checked })
                  }
                />
                <Label htmlFor="isRequired">Required Field</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isEnabled"
                  checked={editForm.isEnabled}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isEnabled: checked })
                  }
                />
                <Label htmlFor="isEnabled">Enabled</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (Order)</Label>
              <Input
                id="priority"
                type="number"
                value={editForm.priority}
                onChange={(e) =>
                  setEditForm({ ...editForm, priority: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validation">Validation Rules (JSON)</Label>
              <Textarea
                id="validation"
                rows={5}
                className="font-mono text-sm"
                placeholder='{"minLength": 2, "maxLength": 50}'
                value={editForm.validation}
                onChange={(e) =>
                  setEditForm({ ...editForm, validation: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="options">Options (JSON, for select fields)</Label>
              <Textarea
                id="options"
                rows={5}
                className="font-mono text-sm"
                placeholder='["Option 1", "Option 2", "Option 3"]'
                value={editForm.options}
                onChange={(e) => setEditForm({ ...editForm, options: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

