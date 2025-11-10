'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Code, 
  Smartphone, 
  Monitor, 
  Sparkles,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailEditorProps {
  htmlContent: string;
  textContent?: string;
  subject: string;
  preheader?: string;
  variables?: string[];
  onHtmlChange: (html: string) => void;
  onTextChange?: (text: string) => void;
  onSubjectChange: (subject: string) => void;
  onPreheaderChange?: (preheader: string) => void;
  onVariablesChange?: (variables: string[]) => void;
  whiteLabelSettings?: {
    brandName: string;
    brandLogo: string;
    primaryColor: string;
    supportEmail: string;
  };
}

export function EmailEditor({
  htmlContent,
  textContent = '',
  subject,
  preheader = '',
  variables = [],
  onHtmlChange,
  onTextChange,
  onSubjectChange,
  onPreheaderChange,
  onVariablesChange,
  whiteLabelSettings
}: EmailEditorProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [newVariable, setNewVariable] = useState('');

  // Replace white-label variables in preview
  const getPreviewHtml = () => {
    let html = htmlContent;
    
    if (whiteLabelSettings) {
      html = html
        .replace(/\{\{brandName\}\}/g, whiteLabelSettings.brandName)
        .replace(/\{\{brandLogo\}\}/g, whiteLabelSettings.brandLogo)
        .replace(/\{\{primaryColor\}\}/g, whiteLabelSettings.primaryColor)
        .replace(/\{\{supportEmail\}\}/g, whiteLabelSettings.supportEmail);
    }

    // Replace other variables with placeholders
    variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      html = html.replace(regex, `<span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px;">${variable}</span>`);
    });

    return html;
  };

  const addVariable = () => {
    if (newVariable && !variables.includes(newVariable)) {
      onVariablesChange?.([...variables, newVariable]);
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    onVariablesChange?.(variables.filter(v => v !== variable));
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{{${variable}}}` + after;
      onHtmlChange(newText);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
      {/* Editor Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Email Content
            </CardTitle>
            <CardDescription>
              Edit your email template with HTML and variables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Your order #{{orderId}} has been confirmed"
              />
            </div>

            {/* Preheader */}
            <div className="space-y-2">
              <Label htmlFor="preheader">Preheader (Preview Text)</Label>
              <Input
                id="preheader"
                value={preheader}
                onChange={(e) => onPreheaderChange?.(e.target.value)}
                placeholder="Thank you for your purchase..."
              />
              <p className="text-xs text-muted-foreground">
                Appears next to subject line in inbox
              </p>
            </div>

            <Separator />

            {/* Variables */}
            <div className="space-y-2">
              <Label>Template Variables</Label>
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
              <div className="flex flex-wrap gap-2 mt-2">
                {variables.map((variable) => (
                  <Badge
                    key={variable}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => insertVariable(variable)}
                  >
                    {`{{${variable}}}`}
                    <X
                      className="h-3 w-3 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVariable(variable);
                      }}
                    />
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to insert into template
              </p>
            </div>

            <Separator />

            {/* HTML Editor */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="h-4 w-4 mr-2" />
                  HTML Code
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="visual" className="space-y-4">
                <div className="space-y-2">
                  <Label>HTML Content</Label>
                  <Textarea
                    id="html-editor"
                    value={htmlContent}
                    onChange={(e) => onHtmlChange(e.target.value)}
                    className="font-mono text-sm min-h-[300px]"
                    placeholder="<div>Your email HTML here...</div>"
                  />
                </div>
              </TabsContent>

              <TabsContent value="code" className="space-y-4">
                <div className="space-y-2">
                  <Label>HTML Source</Label>
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => onHtmlChange(e.target.value)}
                    className="font-mono text-xs min-h-[300px]"
                    placeholder="<html>...</html>"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Text Content */}
            {onTextChange && (
              <div className="space-y-2">
                <Label htmlFor="text-content">Plain Text Version (Optional)</Label>
                <Textarea
                  id="text-content"
                  value={textContent}
                  onChange={(e) => onTextChange(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Plain text fallback for email clients that don't support HTML"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
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
            <CardDescription>
              Preview how your email will look to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div
                className={cn(
                  'mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all',
                  previewMode === 'desktop' ? 'max-w-full' : 'max-w-[375px]'
                )}
              >
                {/* Email Header */}
                <div className="bg-gray-100 p-4 border-b">
                  <div className="text-xs text-gray-500 mb-1">Subject:</div>
                  <div className="font-semibold text-sm">{subject || 'No subject'}</div>
                  {preheader && (
                    <>
                      <div className="text-xs text-gray-500 mt-2 mb-1">Preheader:</div>
                      <div className="text-xs text-gray-600">{preheader}</div>
                    </>
                  )}
                </div>

                {/* Email Body */}
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

