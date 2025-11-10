/**
 * Email Templates Management Page
 * 
 * Features:
 * - List all email templates
 * - Filter and search
 * - Navigate to create/edit pages
 * - Test send functionality
 * - Preset templates library
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Copy,
  CheckCircle,
  Clock,
  Archive,
  Send,
  Sparkles,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

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

export default function EmailTemplatesPage(): React.ReactElement {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [presets, setPresets] = useState<PresetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');

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

  useEffect(() => {
    fetchTemplates();
    fetchPresets();
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      PUBLISHED: { variant: 'default', icon: CheckCircle },
      DRAFT: { variant: 'secondary', icon: Clock },
      REVIEW: { variant: 'outline', icon: CheckCircle },
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
          <Button onClick={() => router.push('/admin/email-templates/create')}>
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
                          <DropdownMenuItem onClick={() => router.push(`/admin/email-templates/${template.id}/edit`)}>
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
