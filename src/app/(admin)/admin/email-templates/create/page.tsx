/**
 * Create Email Template Page
 * 
 * Full-screen editor for creating new email templates
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft,
  Save,
  Eye,
  Code,
  Smartphone,
  Monitor,
  Sparkles,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getBaseEmailLayout } from '@/lib/email-templates/base-layout';

interface WhiteLabelSettings {
  brandName: string;
  brandLogo: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone?: string;
}

export default function CreateEmailTemplatePage(): React.ReactElement {
  const router = useRouter();
  const [whiteLabelSettings, setWhiteLabelSettings] = useState<WhiteLabelSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [newVariable, setNewVariable] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    category: 'TRANSACTIONAL',
    subject: '',
    htmlContent: '<div style="padding: 20px; font-family: Arial, sans-serif;">\n  <h1>Hello {{userName}}!</h1>\n  <p>Your email content here...</p>\n</div>',
    textContent: '',
    preheader: '',
    layout: 'default',
    variables: ['userName'] as string[],
  });

  // Fetch white-label settings
  useEffect(() => {
    const fetchWhiteLabelSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings/public');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setWhiteLabelSettings({
              brandName: data.settings.brandName || 'Apricode Exchange',
              brandLogo: data.settings.brandLogo || '',
              primaryColor: data.settings.primaryColor || '#06b6d4',
              supportEmail: data.settings.supportEmail || '',
              supportPhone: data.settings.supportPhone || '',
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch white-label settings:', error);
      }
    };

    fetchWhiteLabelSettings();
  }, []);

  // Create template
  const handleCreate = async () => {
    if (!formData.key || !formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template created successfully');
        router.push(`/admin/email-templates/${data.template.id}/edit`);
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  // Replace white-label variables in preview
  const getPreviewHtml = () => {
    let bodyContent = formData.htmlContent;
    
    // Replace other variables with highlighted placeholders (except white-label vars)
    formData.variables.forEach(variable => {
      // Skip white-label variables - they will be replaced by layout
      if (['brandName', 'brandLogo', 'primaryColor', 'supportEmail', 'supportPhone'].includes(variable)) {
        return;
      }
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      bodyContent = bodyContent.replace(regex, `<span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${variable}</span>`);
    });

    // Wrap in base layout with white-label settings
    let fullHtml = getBaseEmailLayout(bodyContent, whiteLabelSettings || {
      brandName: 'Your Brand',
      brandLogo: '/logo.png',
      primaryColor: '#06b6d4',
      supportEmail: 'support@example.com',
      supportPhone: '',
    });

    // Replace preheader
    fullHtml = fullHtml.replace(/\{\{preheader\}\}/g, formData.preheader);

    return fullHtml;
  };

  // Add variable
  const addVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData({ ...formData, variables: [...formData.variables, newVariable] });
      setNewVariable('');
    }
  };

  // Remove variable
  const removeVariable = (variable: string) => {
    setFormData({ ...formData, variables: formData.variables.filter(v => v !== variable) });
  };

  // Insert variable into HTML
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{{${variable}}}` + after;
      setFormData({ ...formData, htmlContent: newText });
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin/email-templates')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Create Email Template</h1>
              <p className="text-sm text-muted-foreground">
                Design a beautiful email template with live preview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/email-templates')}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-0 h-full">
          {/* Left Panel - Editor */}
          <div className="border-r overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Template Key *</Label>
                        <Input
                          value={formData.key}
                          onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                          placeholder="ORDER_CREATED"
                        />
                        <p className="text-xs text-muted-foreground">
                          Unique identifier (uppercase, underscores only)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Template Name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Order Created Email"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                            <SelectItem value="NOTIFICATION">Notification</SelectItem>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="SYSTEM">System</SelectItem>
                            <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Layout</Label>
                        <Select value={formData.layout} onValueChange={(v) => setFormData({ ...formData, layout: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of this template..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject Line *</Label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Your order #{{orderId}} has been confirmed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preheader Text</Label>
                      <Input
                        value={formData.preheader}
                        onChange={(e) => setFormData({ ...formData, preheader: e.target.value })}
                        placeholder="Thank you for your purchase..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Appears next to subject line in inbox
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Variables */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template Variables</CardTitle>
                    <CardDescription>
                      Click a variable to insert it into your template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newVariable}
                        onChange={(e) => setNewVariable(e.target.value)}
                        placeholder="e.g., orderId, userName"
                        onKeyDown={(e) => e.key === 'Enter' && addVariable()}
                      />
                      <Button onClick={addVariable} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable) => (
                        <Badge
                          key={variable}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80 px-3 py-1"
                          onClick={() => insertVariable(variable)}
                        >
                          {`{{${variable}}}`}
                          <X
                            className="h-3 w-3 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeVariable(variable);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* HTML Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle>HTML Content *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="visual">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Visual
                        </TabsTrigger>
                        <TabsTrigger value="code">
                          <Code className="h-4 w-4 mr-2" />
                          Code
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="visual" className="mt-4">
                        <Textarea
                          id="html-editor"
                          value={formData.htmlContent}
                          onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                          className="font-mono text-sm min-h-[400px]"
                          placeholder="<div>Your email HTML here...</div>"
                        />
                      </TabsContent>
                      <TabsContent value="code" className="mt-4">
                        <Textarea
                          value={formData.htmlContent}
                          onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                          className="font-mono text-xs min-h-[400px]"
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Plain Text */}
                <Card>
                  <CardHeader>
                    <CardTitle>Plain Text Version (Optional)</CardTitle>
                    <CardDescription>
                      Fallback for email clients that don't support HTML
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.textContent}
                      onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                      className="min-h-[150px]"
                      placeholder="Plain text version of your email..."
                    />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Preview */}
          <div className="bg-muted/30 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          Live Preview
                        </CardTitle>
                        <CardDescription>
                          See how your email will look to recipients
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={previewMode === 'desktop' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('desktop')}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={previewMode === 'mobile' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewMode('mobile')}
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={cn(
                        'mx-auto bg-white rounded-lg shadow-xl overflow-hidden transition-all',
                        previewMode === 'desktop' ? 'max-w-full' : 'max-w-[375px]'
                      )}
                    >
                      {/* Email Header */}
                      <div className="bg-gray-100 p-4 border-b">
                        <div className="text-xs text-gray-500 mb-1">Subject:</div>
                        <div className="font-semibold text-sm">{formData.subject || 'No subject'}</div>
                        {formData.preheader && (
                          <>
                            <div className="text-xs text-gray-500 mt-2 mb-1">Preheader:</div>
                            <div className="text-xs text-gray-600">{formData.preheader}</div>
                          </>
                        )}
                      </div>

                      {/* Email Body */}
                      <div
                        className="p-4 bg-white"
                        dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

