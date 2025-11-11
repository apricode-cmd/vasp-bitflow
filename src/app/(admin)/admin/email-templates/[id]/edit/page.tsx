/**
 * Email Template Editor Page
 * 
 * Full-screen email editor with live preview
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
  Send,
  Sparkles,
  Plus,
  X,
  Loader2,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getBaseEmailLayout } from '@/lib/email-templates/base-layout';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  layout: string;
  variables: string[];
  version: number;
  status: string;
}

interface WhiteLabelSettings {
  brandName: string;
  brandLogo: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone?: string;
}

export default function EmailTemplateEditorPage({ params }: { params: { id: string } }): React.ReactElement {
  const router = useRouter();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [whiteLabelSettings, setWhiteLabelSettings] = useState<WhiteLabelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [newVariable, setNewVariable] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'TRANSACTIONAL',
    subject: '',
    htmlContent: '',
    textContent: '',
    preheader: '',
    layout: 'default',
    variables: [] as string[],
  });

  // Fetch template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/email-templates/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.template) {
            setTemplate(data.template);
            setFormData({
              name: data.template.name,
              description: data.template.description || '',
              category: data.template.category,
              subject: data.template.subject,
              htmlContent: data.template.htmlContent || '',
              textContent: data.template.textContent || '',
              preheader: data.template.preheader || '',
              layout: data.template.layout,
              variables: data.template.variables || [],
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch template:', error);
        toast.error('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

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

    fetchTemplate();
    fetchWhiteLabelSettings();
  }, [params.id]);

  // Save template
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/email-templates/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template saved successfully');
        // Refresh template data
        setTemplate(data.template);
      } else {
        toast.error(data.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Replace white-label variables in preview
  const getPreviewHtml = () => {
    let html = formData.htmlContent;
    
    // Check if htmlContent already has full layout (contains <!DOCTYPE html>)
    const hasFullLayout = html.includes('<!DOCTYPE html>');
    
    if (hasFullLayout) {
      // Already has full layout, just replace variables
      if (whiteLabelSettings) {
        html = html
          .replace(/\{\{brandName\}\}/g, whiteLabelSettings.brandName)
          .replace(/\{\{brandLogo\}\}/g, whiteLabelSettings.brandLogo)
          .replace(/\{\{primaryColor\}\}/g, whiteLabelSettings.primaryColor)
          .replace(/\{\{supportEmail\}\}/g, whiteLabelSettings.supportEmail)
          .replace(/\{\{supportPhone\}\}/g, whiteLabelSettings.supportPhone || '');
      }

      // Replace other variables with sample data (not HTML tags to avoid breaking attributes)
      formData.variables.forEach(variable => {
        // Skip white-label variables
        if (['brandName', 'brandLogo', 'primaryColor', 'supportEmail', 'supportPhone'].includes(variable)) {
          return;
        }
        const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
        // Use simple text replacement to avoid breaking HTML structure
        const sampleValues: Record<string, string> = {
          'userName': 'John Doe',
          'orderId': 'ORD-12345',
          'amount': '0.5',
          'currency': 'BTC',
          'cryptoCurrency': 'Bitcoin',
          'walletAddress': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          'orderUrl': '#',
          'resetUrl': '#',
          'expiresIn': '15 minutes',
          'txHash': '0x1234...abcd',
          'rate': '50000',
          'total': '25000',
        };
        html = html.replace(regex, sampleValues[variable] || `[${variable}]`);
      });

      // Replace preheader
      html = html.replace(/\{\{preheader\}\}/g, formData.preheader || '');

      return html;
    } else {
      // Body content only, wrap in layout
      let bodyContent = html;
      
      // Replace other variables with highlighted placeholders (except white-label vars)
      formData.variables.forEach(variable => {
        if (['brandName', 'brandLogo', 'primaryColor', 'supportEmail', 'supportPhone'].includes(variable)) {
          return;
        }
        const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
        bodyContent = bodyContent.replace(regex, `<span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${variable}</span>`);
      });

      // Wrap in base layout
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
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Template not found</p>
        <Button onClick={() => router.push('/admin/email-templates')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold">{template.name}</h1>
              <p className="text-sm text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{template.key}</code>
                {' • '}Version {template.version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Test Send
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
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
                        <Label>Template Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
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
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                      <Label>Subject Line</Label>
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
                    <CardTitle>HTML Content</CardTitle>
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
                      {/* Visual Editor - User-friendly with tips */}
                      <TabsContent value="visual" className="mt-4">
                        <div className="space-y-3">
                          {/* Email Best Practices */}
                          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 p-3">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                              <span>📧</span> Email Best Practices
                            </h4>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4">
                              <li>• Use <strong>inline styles</strong> (style="...") instead of CSS classes</li>
                              <li>• Use <strong>tables</strong> for layout, not divs</li>
                              <li>• Keep width <strong>max 600px</strong> for desktop compatibility</li>
                              <li>• Use merge tags: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{userName}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{orderId}}'}</code></li>
                              <li>• Test in Gmail, Outlook, and Apple Mail</li>
                            </ul>
                          </div>

                          <div className="border rounded-lg p-4 bg-white dark:bg-slate-950">
                            <Textarea
                              id="html-editor"
                              value={formData.htmlContent}
                              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                              className="font-sans text-base min-h-[500px] border-0 focus-visible:ring-0 resize-none"
                              placeholder="Edit your email HTML here..."
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>💡 Use variables panel on the right to insert dynamic content</span>
                            <span className="font-mono">{formData.htmlContent.length} chars</span>
                          </div>
                        </div>
                      </TabsContent>
                      
                      {/* Code Editor - Developer mode */}
                      <TabsContent value="code" className="mt-4">
                        <div className="border rounded-lg bg-slate-950 p-4">
                          <Textarea
                            value={formData.htmlContent}
                            onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                            className="font-mono text-xs min-h-[500px] bg-slate-950 text-green-400 border-0 focus-visible:ring-0 resize-none"
                            placeholder="<!DOCTYPE html>..."
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Raw HTML mode - edit the complete email template
                        </p>
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
                        'mx-auto rounded-lg shadow-xl overflow-hidden transition-all',
                        previewMode === 'desktop' ? 'max-w-full' : 'max-w-[375px]'
                      )}
                    >
                      {/* Email Header Info */}
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

                      {/* Email Body - Use iframe for proper HTML email rendering */}
                      <iframe
                        srcDoc={getPreviewHtml()}
                        className="w-full border-0"
                        style={{ minHeight: '600px', height: 'auto' }}
                        title="Email Preview"
                        sandbox="allow-same-origin"
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

