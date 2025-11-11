'use client';

/**
 * Test Notifications Page
 * 
 * Страница для тестирования отправки уведомлений (email, in-app)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Mail, Bell, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  variables: string[];
}

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentTo?: string;
  templateKey?: string;
}

export default function TestNotificationsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Email test form
  const [emailRecipient, setEmailRecipient] = useState('bogdan.apricode@gmail.com');
  const [fromEmail, setFromEmail] = useState('onboarding@resend.dev');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  
  // Test results
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/test-email');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].key);
        }
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailRecipient) {
      toast.error('Please enter recipient email');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    try {
      setSending(true);
      
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecipient,
          from: fromEmail || undefined,
          templateKey: selectedTemplate,
          testData: {
            subject: customSubject || undefined,
            message: customMessage || undefined,
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Test email sent to ${emailRecipient}!`);
        setTestResults(prev => [data, ...prev]);
      } else {
        toast.error(data.error || 'Failed to send test email');
        setTestResults(prev => [{ success: false, error: data.error, sentTo: emailRecipient }, ...prev]);
      }
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
      setTestResults(prev => [{ success: false, error: error.message, sentTo: emailRecipient }, ...prev]);
    } finally {
      setSending(false);
    }
  };

  const selectedTemplateData = templates.find(t => t.key === selectedTemplate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Test email and in-app notifications with real templates
        </p>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email Notifications
          </TabsTrigger>
          <TabsTrigger value="in-app">
            <Bell className="h-4 w-4 mr-2" />
            In-App Notifications
          </TabsTrigger>
        </TabsList>

        {/* Email Test Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Test email delivery with actual templates and white-label settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Recipient Email *</Label>
                      <Input
                        id="recipient"
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="test@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="from-email">From Email *</Label>
                      <Input
                        id="from-email"
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="onboarding@resend.dev"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use <code className="bg-muted px-1 rounded">onboarding@resend.dev</code> for testing
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template">Email Template *</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.key}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplateData && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{selectedTemplateData.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedTemplateData.description}</p>
                          {selectedTemplateData.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedTemplateData.variables.map((variable) => (
                                <Badge key={variable} variant="secondary" className="text-xs">
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="custom-subject">Custom Subject (optional)</Label>
                    <Input
                      id="custom-subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Override template subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-message">Custom Message (optional)</Label>
                    <Textarea
                      id="custom-message"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Additional message for generic templates"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button 
                      onClick={handleSendTestEmail} 
                      disabled={sending || !emailRecipient || !selectedTemplate}
                      className="flex-1"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Recent test email sends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {result.success ? 'Email sent successfully' : 'Failed to send email'}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {result.sentTo && <p>To: {result.sentTo}</p>}
                          {result.templateKey && <p>Template: {result.templateKey}</p>}
                          {result.messageId && <p>Message ID: {result.messageId}</p>}
                          {result.error && <p className="text-red-600 dark:text-red-400">Error: {result.error}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* In-App Test Tab */}
        <TabsContent value="in-app">
          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>
                Test in-app notification delivery (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>In-app notification testing will be available soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            Current notification provider configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Resend</p>
                  <p className="text-xs text-muted-foreground">Email Provider</p>
                </div>
              </div>
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

