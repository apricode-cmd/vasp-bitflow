/**
 * Email Templates Management Page
 * 
 * Features:
 * - Visual email editor with live preview
 * - White-label integration
 * - Preset templates library
 * - Test send functionality
 * - Template versioning
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Plus, 
  RefreshCw,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  Send,
  Sparkles,
  Download,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EmailEditor } from '@/components/email/EmailEditor';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  preheader?: string;
  htmlContent?: string;
  textContent?: string;
  layout: string;
  variables: string[];
  version: number;
  isActive: boolean;
  isDefault: boolean;
  status: string;
  publishedAt?: string;
  publishedBy?: string;
  orgId?: string | null;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  lastUsed?: string | null;
}

interface PresetTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  variables: string[];
  layout: string;
}

interface WhiteLabelSettings {
  brandName: string;
  brandLogo: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone?: string;
}

export default function EmailTemplatesPage(): React.ReactElement {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [presets, setPresets] = useState<PresetTemplate[]>([]);
  const [whiteLabelSettings, setWhiteLabelSettings] = useState<WhiteLabelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    key: '',
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

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Fetch presets
  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/admin/email-templates/presets');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  // Fetch white-label settings
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

  useEffect(() => {
    fetchTemplates();
    fetchPresets();
    fetchWhiteLabelSettings();
  }, []);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Create template
  const handleCreate = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template created successfully');
        setCreateDialogOpen(false);
        fetchTemplates();
        resetForm();
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    } finally {
      setActionLoading(false);
    }
  };

  // Update template
  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template updated successfully');
        setEditDialogOpen(false);
        fetchTemplates();
        resetForm();
      } else {
        toast.error(data.error || 'Failed to update template');
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete template
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template deleted successfully');
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Import preset
  const handleImportPreset = async (presetKey: string) => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/email-templates/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetKey })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template imported successfully');
        setPresetsDialogOpen(false);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to import template');
      }
    } catch (error) {
      console.error('Failed to import preset:', error);
      toast.error('Failed to import template');
    } finally {
      setActionLoading(false);
    }
  };

  // Test send
  const handleTestSend = async () => {
    if (!selectedTemplate || !testEmail) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmail })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestSendDialogOpen(false);
        setTestEmail('');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      category: 'TRANSACTIONAL',
      subject: '',
      htmlContent: '',
      textContent: '',
      preheader: '',
      layout: 'default',
      variables: [],
    });
    setSelectedTemplate(null);
  };

  // Open edit dialog
  const handleOpenEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      key: template.key,
      name: template.name,
      description: template.description || '',
      category: template.category,
      subject: template.subject,
      htmlContent: template.htmlContent || '',
      textContent: template.textContent || '',
      preheader: template.preheader || '',
      layout: template.layout,
      variables: template.variables,
    });
    setEditDialogOpen(true);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      PUBLISHED: { variant: 'default', icon: CheckCircle },
      DRAFT: { variant: 'secondary', icon: Clock },
      REVIEW: { variant: 'outline', icon: Eye },
      ARCHIVED: { variant: 'destructive', icon: Archive },
    };

    const config = variants[status] || variants.DRAFT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      TRANSACTIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      NOTIFICATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      MARKETING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      SYSTEM: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      COMPLIANCE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[category] || colors.SYSTEM;
  };

  // Stats
  const stats = {
    total: templates.length,
    published: templates.filter(t => t.status === 'PUBLISHED').length,
    draft: templates.filter(t => t.status === 'DRAFT').length,
    active: templates.filter(t => t.isActive).length,
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Email Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage beautiful email templates with white-label support
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setPresetsDialogOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Preset Library
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchTemplates}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                  <SelectItem value="NOTIFICATION">Notification</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No templates found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setPresetsDialogOpen(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Browse Preset Library
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          {getStatusBadge(template.status)}
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                          {template.isDefault && (
                            <Badge variant="outline">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Key: <code className="bg-muted px-1 py-0.5 rounded">{template.key}</code></span>
                          <span>Version: {template.version}</span>
                          {template.usageCount !== undefined && (
                            <span>Used: {template.usageCount} times</span>
                          )}
                          {template.lastUsed && (
                            <span>Last used: {formatDistanceToNow(new Date(template.lastUsed), { addSuffix: true })}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedTemplate(template);
                            setTestSendDialogOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-2" />
                            Test Send
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(template.key);
                            toast.success('Template key copied');
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Key
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(template.id)}
                            className="text-destructive"
                            disabled={template.isDefault}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a new email template with visual editor and live preview
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">Template Key *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                  placeholder="ORDER_CREATED"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Order Created Email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
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
                <Label htmlFor="layout">Layout</Label>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
              />
            </div>

            {/* Email Editor */}
            <EmailEditor
              htmlContent={formData.htmlContent}
              textContent={formData.textContent}
              subject={formData.subject}
              preheader={formData.preheader}
              variables={formData.variables}
              onHtmlChange={(html) => setFormData({ ...formData, htmlContent: html })}
              onTextChange={(text) => setFormData({ ...formData, textContent: text })}
              onSubjectChange={(subject) => setFormData({ ...formData, subject })}
              onPreheaderChange={(preheader) => setFormData({ ...formData, preheader })}
              onVariablesChange={(variables) => setFormData({ ...formData, variables })}
              whiteLabelSettings={whiteLabelSettings || undefined}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Update your email template with visual editor and live preview
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-key">Template Key *</Label>
                <Input
                  id="edit-key"
                  value={formData.key}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Order Created Email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
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
                <Label htmlFor="edit-layout">Layout</Label>
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
              />
            </div>

            {/* Email Editor */}
            <EmailEditor
              htmlContent={formData.htmlContent}
              textContent={formData.textContent}
              subject={formData.subject}
              preheader={formData.preheader}
              variables={formData.variables}
              onHtmlChange={(html) => setFormData({ ...formData, htmlContent: html })}
              onTextChange={(text) => setFormData({ ...formData, textContent: text })}
              onSubjectChange={(subject) => setFormData({ ...formData, subject })}
              onPreheaderChange={(preheader) => setFormData({ ...formData, preheader })}
              onVariablesChange={(variables) => setFormData({ ...formData, variables })}
              whiteLabelSettings={whiteLabelSettings || undefined}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Presets Dialog */}
      <Dialog open={presetsDialogOpen} onOpenChange={setPresetsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Template Library
            </DialogTitle>
            <DialogDescription>
              Choose from our collection of professionally designed email templates
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid gap-4">
              {presets.map((preset) => (
                <Card key={preset.key} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{preset.name}</h4>
                          <Badge className={getCategoryColor(preset.category)}>
                            {preset.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {preset.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {preset.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleImportPreset(preset.key)}
                        disabled={actionLoading || templates.some(t => t.key === preset.key)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {templates.some(t => t.key === preset.key) ? 'Imported' : 'Import'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={testSendDialogOpen} onOpenChange={setTestSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify how your template looks in an inbox
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Recipient Email *</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-muted-foreground">
                The email will be sent with test data for all variables
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestSend} disabled={actionLoading || !testEmail}>
              <Send className="h-4 w-4 mr-2" />
              {actionLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
