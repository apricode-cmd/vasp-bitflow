/**
 * Notification Events Management Page
 * 
 * Configure notification events and their settings
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { 
  MessageSquare, 
  Plus, 
  RefreshCw,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Mail,
  Bell,
  Smartphone,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface NotificationEvent {
  id: string;
  eventKey: string;
  name: string;
  description?: string;
  category: string;
  channels: string[];
  priority: string;
  isActive: boolean;
  isSystem: boolean;
  templateKey?: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    subscriptions: number;
    queued: number;
    sent: number;
    failed: number;
    lastSent?: string | null;
  };
}

export default function NotificationEventsPage(): React.ReactElement {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NotificationEvent | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    eventKey: '',
    name: '',
    description: '',
    category: 'ORDER' as const,
    channels: ['EMAIL', 'IN_APP'] as string[],
    priority: 'NORMAL' as const,
    isActive: true,
    templateKey: '',
  });

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notification-events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load notification events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.eventKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Create event
  const handleCreate = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/notification-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Event created successfully');
        setCreateDialogOpen(false);
        fetchEvents();
        resetForm();
      } else {
        toast.error(data.error || 'Failed to create event');
      }
    } catch (error) {
      toast.error('Failed to create event');
    } finally {
      setActionLoading(false);
    }
  };

  // Update event
  const handleUpdate = async () => {
    if (!selectedEvent) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/notification-events/${selectedEvent.eventKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Event updated successfully');
        setEditDialogOpen(false);
        fetchEvents();
        resetForm();
      } else {
        toast.error(data.error || 'Failed to update event');
      }
    } catch (error) {
      toast.error('Failed to update event');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete event
  const handleDelete = async (eventKey: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/notification-events/${eventKey}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Event deleted successfully');
        fetchEvents();
      } else {
        toast.error(data.error || 'Failed to delete event');
      }
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  // Toggle active status
  const handleToggleActive = async (event: NotificationEvent) => {
    try {
      const response = await fetch(`/api/admin/notification-events/${event.eventKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !event.isActive })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Event ${event.isActive ? 'deactivated' : 'activated'}`);
        fetchEvents();
      } else {
        toast.error(data.error || 'Failed to update event');
      }
    } catch (error) {
      toast.error('Failed to update event');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      eventKey: '',
      name: '',
      description: '',
      category: 'ORDER',
      channels: ['EMAIL', 'IN_APP'],
      priority: 'NORMAL',
      isActive: true,
      templateKey: '',
    });
    setSelectedEvent(null);
  };

  // Open edit dialog
  const handleOpenEdit = (event: NotificationEvent) => {
    setSelectedEvent(event);
    setFormData({
      eventKey: event.eventKey,
      name: event.name,
      description: event.description || '',
      category: event.category as any,
      channels: event.channels,
      priority: event.priority as any,
      isActive: event.isActive,
      templateKey: event.templateKey || '',
    });
    setEditDialogOpen(true);
  };

  // Toggle channel
  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      ORDER: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      KYC: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
      PAYMENT: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      SECURITY: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      SYSTEM: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      ADMIN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
      MARKETING: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
    };

    return (
      <Badge variant="outline" className={colors[category] || ''}>
        {category}
      </Badge>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      NORMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
      URGENT: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    };

    return (
      <Badge variant="outline" className={colors[priority] || ''}>
        {priority}
      </Badge>
    );
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-3 w-3" />;
      case 'IN_APP':
        return <Bell className="h-3 w-3" />;
      case 'SMS':
        return <Smartphone className="h-3 w-3" />;
      case 'PUSH':
        return <Send className="h-3 w-3" />;
      default:
        return <Bell className="h-3 w-3" />;
    }
  };

  // Stats
  const stats = {
    total: events.length,
    active: events.filter(e => e.isActive).length,
    inactive: events.filter(e => !e.isActive).length,
    system: events.filter(e => e.isSystem).length,
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Events</h1>
          <p className="text-muted-foreground mt-1">
            Configure notification events and their delivery channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchEvents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.system}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ORDER">Order</SelectItem>
                <SelectItem value="KYC">KYC</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({filteredEvents.length})</CardTitle>
          <CardDescription>
            Manage notification events and their delivery settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No notification events configured'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-shrink-0 h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{event.name}</h3>
                      {getCategoryBadge(event.category)}
                      {getPriorityBadge(event.priority)}
                      {event.isSystem && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          System
                        </Badge>
                      )}
                      {!event.isActive && (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description || event.eventKey}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Key: <code className="bg-muted px-1 rounded">{event.eventKey}</code></span>
                      <div className="flex items-center gap-1">
                        <span>Channels:</span>
                        {event.channels.map(channel => (
                          <Badge key={channel} variant="secondary" className="h-5 px-1.5 gap-1">
                            {getChannelIcon(channel)}
                            {channel}
                          </Badge>
                        ))}
                      </div>
                      {event.stats && (
                        <>
                          <span>Sent: {event.stats.sent}</span>
                          {event.stats.failed > 0 && (
                            <span className="text-red-600">Failed: {event.stats.failed}</span>
                          )}
                        </>
                      )}
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {!event.isSystem && (
                        <>
                          <DropdownMenuItem onClick={() => handleOpenEdit(event)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(event)}
                          >
                            {event.isActive ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(event.eventKey)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              Event details and statistics
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Event Key</Label>
                  <code className="block mt-1 bg-muted px-2 py-1 rounded text-sm">
                    {selectedEvent.eventKey}
                  </code>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <div className="mt-1">
                    {getCategoryBadge(selectedEvent.category)}
                  </div>
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedEvent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <div className="mt-1">
                    {getPriorityBadge(selectedEvent.priority)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {selectedEvent.isActive ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Channels</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedEvent.channels.map((channel) => (
                    <Badge key={channel} variant="secondary" className="gap-1">
                      {getChannelIcon(channel)}
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedEvent.templateKey && (
                <div>
                  <Label className="text-xs text-muted-foreground">Email Template</Label>
                  <code className="block mt-1 bg-muted px-2 py-1 rounded text-sm">
                    {selectedEvent.templateKey}
                  </code>
                </div>
              )}

              {selectedEvent.stats && (
                <div>
                  <Label className="text-xs text-muted-foreground">Statistics</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground">Subscriptions</div>
                      <div className="text-2xl font-bold">{selectedEvent.stats.subscriptions}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground">Sent</div>
                      <div className="text-2xl font-bold text-green-600">{selectedEvent.stats.sent}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground">Failed</div>
                      <div className="text-2xl font-bold text-red-600">{selectedEvent.stats.failed}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground">Queued</div>
                      <div className="text-2xl font-bold text-blue-600">{selectedEvent.stats.queued}</div>
                    </div>
                  </div>
                  {selectedEvent.stats.lastSent && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last sent: {formatDistanceToNow(new Date(selectedEvent.stats.lastSent), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Notification Event</DialogTitle>
            <DialogDescription>
              Create a new notification event with custom settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventKey">Event Key *</Label>
                <Input
                  id="eventKey"
                  placeholder="ORDER_CREATED"
                  value={formData.eventKey}
                  onChange={(e) => setFormData({ ...formData, eventKey: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (e.g., ORDER_CREATED)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  placeholder="Order Created"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Triggered when a new order is created"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORDER">Order</SelectItem>
                    <SelectItem value="KYC">KYC</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Channels *</Label>
              <div className="flex flex-wrap gap-3">
                {['EMAIL', 'IN_APP', 'SMS', 'PUSH'].map((channel) => (
                  <div key={channel} className="flex items-center space-x-2">
                    <Switch
                      id={`channel-${channel}`}
                      checked={formData.channels.includes(channel)}
                      onCheckedChange={() => toggleChannel(channel)}
                    />
                    <Label htmlFor={`channel-${channel}`} className="cursor-pointer">
                      {channel}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select at least one delivery channel
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateKey">Email Template Key (Optional)</Label>
              <Input
                id="templateKey"
                placeholder="ORDER_CREATED"
                value={formData.templateKey}
                onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Link to an email template for this event
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (event will trigger notifications)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={actionLoading || !formData.eventKey || !formData.name || formData.channels.length === 0}>
              {actionLoading ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Notification Event</DialogTitle>
            <DialogDescription>
              Update event settings and configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Key (Read-only)</Label>
              <code className="block bg-muted px-3 py-2 rounded text-sm">
                {formData.eventKey}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Event Name *</Label>
              <Input
                id="edit-name"
                placeholder="Order Created"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Triggered when a new order is created"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORDER">Order</SelectItem>
                    <SelectItem value="KYC">KYC</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Channels *</Label>
              <div className="flex flex-wrap gap-3">
                {['EMAIL', 'IN_APP', 'SMS', 'PUSH'].map((channel) => (
                  <div key={channel} className="flex items-center space-x-2">
                    <Switch
                      id={`edit-channel-${channel}`}
                      checked={formData.channels.includes(channel)}
                      onCheckedChange={() => toggleChannel(channel)}
                    />
                    <Label htmlFor={`edit-channel-${channel}`} className="cursor-pointer">
                      {channel}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-templateKey">Email Template Key (Optional)</Label>
              <Input
                id="edit-templateKey"
                placeholder="ORDER_CREATED"
                value={formData.templateKey}
                onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive" className="cursor-pointer">
                Active (event will trigger notifications)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={actionLoading || !formData.name || formData.channels.length === 0}>
              {actionLoading ? 'Updating...' : 'Update Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

