/**
 * KYC Form Fields Configuration - Admin Panel
 * Uses shared config from src/lib/kyc/config.ts
 * Shows fields grouped by Steps (not categories)
 */
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
import { Edit, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { KYC_STEPS, KYC_CATEGORIES, getCategoryIcon } from '@/lib/kyc/config';
import * as Icons from 'lucide-react';
import { BrandLoaderInline } from '@/components/ui/brand-loader';
import { ConditionalLogicSection } from '@/components/admin/kyc/ConditionalLogicSection';
import { UXEnhancementsSection } from '@/components/admin/kyc/UXEnhancementsSection';
import { ValidationRulesSection } from '@/components/admin/kyc/ValidationRulesSection';
import { CategoryGroupSection } from '@/components/admin/kyc/CategoryGroupSection';

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
  dependsOn: string | null;
  showWhen: any;
  helpText: string | null;
  placeholder: string | null;
  customClass: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function KycFormFieldsPage() {
  const [fields, setFields] = useState<KycField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<KycField | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('step-1');

  // Form state for editing
  const [editForm, setEditForm] = useState({
    label: '',
    isRequired: false,
    isEnabled: true,
    priority: 0,
    validation: '',
    options: '',
    dependsOn: null as string | null,
    showWhen: null as any,
    helpText: '',
    placeholder: '',
    customClass: ''
  });
  
  // Tab state for edit dialog
  const [editDialogTab, setEditDialogTab] = useState('basic');
  
  // View mode: 'steps' or 'groups'
  const [viewMode, setViewMode] = useState<'steps' | 'groups'>('steps');

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const res = await fetch('/api/admin/kyc/form-fields');
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      setFields(data.fields || []);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      toast.error('Failed to load KYC fields');
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
      options: field.options ? JSON.stringify(field.options, null, 2) : '',
      dependsOn: field.dependsOn || null,
      showWhen: field.showWhen || null,
      helpText: field.helpText || '',
      placeholder: field.placeholder || '',
      customClass: field.customClass || ''
    });
    setEditDialogTab('basic');
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedField) return;

    setSaving(true);
    try {
      // Parse validation and options
      let validation = null;
      let options = null;

      if (editForm.validation.trim()) {
        try {
          validation = JSON.parse(editForm.validation);
        } catch {
          toast.error('Invalid JSON in validation field');
          setSaving(false);
          return;
        }
      }

      if (editForm.options.trim()) {
        try {
          options = JSON.parse(editForm.options);
        } catch {
          toast.error('Invalid JSON in options field');
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`/api/admin/kyc/form-fields/${selectedField.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editForm.label,
          isRequired: editForm.isRequired,
          isEnabled: editForm.isEnabled,
          priority: parseInt(editForm.priority.toString()),
          validation,
          options,
          dependsOn: editForm.dependsOn || null,
          showWhen: editForm.showWhen || null,
          helpText: editForm.helpText || null,
          placeholder: editForm.placeholder || null,
          customClass: editForm.customClass || null
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success('Field updated successfully');
      setEditDialog(false);
      fetchFields();
    } catch (error) {
      console.error('Failed to save field:', error);
      toast.error('Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (field: KycField, toggleField: 'isRequired' | 'isEnabled') => {
    try {
      const res = await fetch(`/api/admin/kyc/form-fields/${field.id}`, {
        method: 'PATCH',
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
    return <BrandLoaderInline size="md" text="Loading KYC fields..." />;
  }

  // Group fields by step
  const fieldsByStep = KYC_STEPS.map(step => {
    const stepFields = fields.filter(f => step.categories.includes(f.category));
    const enabledCount = stepFields.filter(f => f.isEnabled).length;
    
    return {
      step,
      fields: stepFields,
      enabledCount,
      totalCount: stepFields.length
    };
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">KYC Form Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure KYC form fields. Total: {fields.length} fields
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'steps' | 'groups')}>
          <TabsList>
            <TabsTrigger value="steps">Steps View</TabsTrigger>
            <TabsTrigger value="groups">Groups View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {fieldsByStep.map(({ step, enabledCount, totalCount }) => {
          const isActive = activeTab === `step-${step.id}`;
          
          return (
            <Card 
              key={step.id} 
              className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
              onClick={() => setActiveTab(`step-${step.id}`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                  Step {step.id}
                </CardTitle>
                <CardDescription className="text-sm">{step.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {enabledCount} <span className="text-sm font-normal text-muted-foreground">/ {totalCount}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {enabledCount === 0 ? '⚠️ No enabled fields' : 'fields enabled'}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {step.categories.map(cat => {
                      const categoryInfo = KYC_CATEGORIES[cat];
                      return (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {categoryInfo?.name.split(' ')[0] || cat}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Groups View */}
      {viewMode === 'groups' && (
        <div className="space-y-4">
          {Object.keys(KYC_CATEGORIES).map((categoryCode) => {
            const categoryFields = fields.filter(f => f.category === categoryCode);
            if (categoryFields.length === 0) return null;
            
            return (
              <CategoryGroupSection
                key={categoryCode}
                categoryCode={categoryCode}
                fields={categoryFields}
                isCollapsible={true}
                defaultCollapsed={false}
                onFieldClick={handleEdit}
              />
            );
          })}
        </div>
      )}

      {/* Steps View (Tabs by Step) */}
      {viewMode === 'steps' && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-auto">
            {KYC_STEPS.map((step) => (
              <TabsTrigger key={step.id} value={`step-${step.id}`} className="flex items-center gap-2">
                <span className="font-semibold">Step {step.id}:</span>
                <span>{step.title}</span>
                </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {fieldsByStep.map(({ step, fields: stepFields }) => (
          <TabsContent key={step.id} value={`step-${step.id}`} className="space-y-4">
            {/* Step Info */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Step {step.id}: {step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {step.categories.map(categoryCode => {
                    const category = KYC_CATEGORIES[categoryCode];
                    const IconComponent = (Icons as any)[category?.icon] || Icons.FileText;
                    const categoryFieldsCount = stepFields.filter(f => f.category === categoryCode).length;
                    const categoryEnabledCount = stepFields.filter(f => f.category === categoryCode && f.isEnabled).length;

          return (
                      <Badge key={categoryCode} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
                        <IconComponent className="h-3.5 w-3.5" />
                        <span>{category?.name || categoryCode}</span>
                        <span className="text-xs text-muted-foreground">({categoryEnabledCount}/{categoryFieldsCount})</span>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Fields grouped by category within step */}
            {step.categories.map(categoryCode => {
              const category = KYC_CATEGORIES[categoryCode];
              const categoryFields = stepFields.filter(f => f.category === categoryCode);
              
              if (categoryFields.length === 0) return null;

              const IconComponent = (Icons as any)[category?.icon] || Icons.FileText;

              return (
                <Card key={categoryCode}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconComponent className="h-5 w-5" />
                      {category?.name || categoryCode}
                  </CardTitle>
                  <CardDescription>
                      {categoryFields.length} field(s) • {categoryFields.filter(f => f.isEnabled).length} enabled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                      {categoryFields.map((field) => (
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
                              variant="ghost"
                              size="icon"
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
          );
        })}

            {/* Empty state */}
            {stepFields.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Fields in This Step</h3>
                  <p className="text-muted-foreground">
                    This step doesn't have any configured fields yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Field: {selectedField?.fieldName}</DialogTitle>
            <DialogDescription>
              Modify field configuration. Changes will apply immediately.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={editDialogTab} onValueChange={setEditDialogTab} className="py-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="conditional">Conditional</TabsTrigger>
              <TabsTrigger value="ux">UX</TabsTrigger>
            </TabsList>

            {/* Basic Settings Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority (order)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRequired"
                    checked={editForm.isRequired}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, isRequired: checked })}
                  />
                  <Label htmlFor="isRequired">Required</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isEnabled"
                    checked={editForm.isEnabled}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, isEnabled: checked })}
                  />
                  <Label htmlFor="isEnabled">Enabled</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="options">Options (JSON array for select fields)</Label>
                <Textarea
                  id="options"
                  value={editForm.options}
                  onChange={(e) => setEditForm({ ...editForm, options: e.target.value })}
                  rows={4}
                  placeholder='["Option 1", "Option 2", "Option 3"]'
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  For select/radio/checkbox fields only
                </p>
              </div>
            </TabsContent>

            {/* Validation Tab */}
            <TabsContent value="validation" className="mt-4">
              <ValidationRulesSection
                fieldType={selectedField?.fieldType || 'text'}
                validation={editForm.validation ? (typeof editForm.validation === 'string' ? JSON.parse(editForm.validation || '{}') : editForm.validation) : null}
                onChange={(validationObj) => {
                  setEditForm({ 
                    ...editForm, 
                    validation: validationObj ? JSON.stringify(validationObj, null, 2) : ''
                  });
                }}
              />
            </TabsContent>

            {/* Conditional Logic Tab */}
            <TabsContent value="conditional" className="mt-4">
              <ConditionalLogicSection
                value={{
                  dependsOn: editForm.dependsOn,
                  showWhen: editForm.showWhen
                }}
                onChange={(config) => setEditForm({ 
                  ...editForm, 
                  dependsOn: config.dependsOn,
                  showWhen: config.showWhen
                })}
                availableFields={fields.map(f => ({
                  fieldName: f.fieldName,
                  label: f.label,
                  fieldType: f.fieldType
                }))}
                currentFieldName={selectedField?.fieldName || ''}
              />
            </TabsContent>

            {/* UX Enhancements Tab */}
            <TabsContent value="ux" className="mt-4">
              <UXEnhancementsSection
                helpText={editForm.helpText}
                placeholder={editForm.placeholder}
                customClass={editForm.customClass}
                onHelpTextChange={(value) => setEditForm({ ...editForm, helpText: value })}
                onPlaceholderChange={(value) => setEditForm({ ...editForm, placeholder: value })}
                onCustomClassChange={(value) => setEditForm({ ...editForm, customClass: value })}
                fieldType={selectedField?.fieldType || 'text'}
              />
            </TabsContent>
          </Tabs>

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
