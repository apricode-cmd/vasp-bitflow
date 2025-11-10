/**
 * Notification Queue Monitoring Page
 * 
 * Monitor notification delivery queue and troubleshoot issues
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Send, 
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Mail,
  Bell,
  Smartphone,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface QueueItem {
  id: string;
  eventKey: string;
  channel: string;
  status: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  message: string;
  attempts: number;
  maxAttempts: number;
  scheduledFor: string;
  processedAt?: string;
  sentAt?: string;
  failedAt?: string;
  error?: string;
  errorDetails?: any;
  messageId?: string;
  providerId?: string;
  createdAt: string;
  event?: {
    name: string;
    category: string;
    priority: string;
  };
  user?: {
    id: string;
    email: string;
  };
}

export default function NotificationQueuePage(): React.ReactElement {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    skipped: 0,
  });

  // Fetch queue items
  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (channelFilter !== 'all') params.append('channel', channelFilter);
      
      const response = await fetch(`/api/admin/notification-queue?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.queueItems || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      toast.error('Failed to load notification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, channelFilter]);

  // Retry failed notification
  const handleRetry = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/notification-queue/${itemId}/retry`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Notification queued for retry');
        fetchQueue();
      } else {
        toast.error(data.error || 'Failed to retry notification');
      }
    } catch (error) {
      toast.error('Failed to retry notification');
    }
  };

  // Filter queue items
  const filteredItems = queueItems.filter(item => {
    const matchesSearch = 
      item.eventKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; color: string }> = {
      PENDING: { variant: 'secondary', icon: Clock, color: 'text-blue-600' },
      PROCESSING: { variant: 'default', icon: RefreshCw, color: 'text-purple-600' },
      SENT: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      FAILED: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      CANCELLED: { variant: 'secondary', icon: XCircle, color: 'text-gray-600' },
      SKIPPED: { variant: 'secondary', icon: AlertTriangle, color: 'text-amber-600' },
    };

    const config = statusConfig[status] || { variant: 'secondary', icon: Clock, color: '' };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      case 'IN_APP':
        return <Bell className="h-4 w-4" />;
      case 'SMS':
        return <Smartphone className="h-4 w-4" />;
      case 'PUSH':
        return <Send className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Queue</h1>
          <p className="text-muted-foreground mt-1">
            Monitor notification delivery and troubleshoot issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchQueue}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-600" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Skipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.skipped}</div>
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
                placeholder="Search by event, recipient, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="SKIPPED">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="IN_APP">In-App</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="PUSH">Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Items ({filteredItems.length})</CardTitle>
          <CardDescription>
            Monitor notification delivery status and troubleshoot issues
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No queue items found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || channelFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All notifications have been processed'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className={`flex-shrink-0 h-12 w-12 rounded flex items-center justify-center ${
                    item.status === 'SENT' ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' :
                    item.status === 'FAILED' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                    item.status === 'PROCESSING' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400' :
                    'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  }`}>
                    {getChannelIcon(item.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.event?.name || item.eventKey}</h3>
                      {getStatusBadge(item.status)}
                      <Badge variant="outline" className="gap-1">
                        {getChannelIcon(item.channel)}
                        {item.channel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      To: {item.recipientEmail || item.recipientPhone || item.user?.email || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Attempts: {item.attempts}/{item.maxAttempts}</span>
                      {item.sentAt && (
                        <span>Sent: {formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })}</span>
                      )}
                      {item.failedAt && (
                        <span className="text-red-600">Failed: {formatDistanceToNow(new Date(item.failedAt), { addSuffix: true })}</span>
                      )}
                      {item.error && (
                        <span className="text-red-600 truncate">Error: {item.error}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedItem(item);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {item.status === 'FAILED' && item.attempts < item.maxAttempts && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(item.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Item Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              View notification delivery details and troubleshoot issues
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="mt-1">
                    {getStatusBadge(selectedItem.status)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Channel</span>
                  <div className="mt-1">
                    <Badge variant="outline" className="gap-1">
                      {getChannelIcon(selectedItem.channel)}
                      {selectedItem.channel}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">Event</span>
                <p className="mt-1 text-sm">{selectedItem.event?.name || selectedItem.eventKey}</p>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">Recipient</span>
                <p className="mt-1 text-sm">
                  {selectedItem.recipientEmail || selectedItem.recipientPhone || selectedItem.user?.email || 'Unknown'}
                </p>
              </div>

              {selectedItem.subject && (
                <div>
                  <span className="text-xs text-muted-foreground">Subject</span>
                  <p className="mt-1 text-sm">{selectedItem.subject}</p>
                </div>
              )}

              <div>
                <span className="text-xs text-muted-foreground">Message</span>
                <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-[200px] overflow-auto">
                  {selectedItem.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Attempts</span>
                  <p className="mt-1 text-sm">{selectedItem.attempts} / {selectedItem.maxAttempts}</p>
                </div>
                {selectedItem.providerId && (
                  <div>
                    <span className="text-xs text-muted-foreground">Provider</span>
                    <p className="mt-1 text-sm">{selectedItem.providerId}</p>
                  </div>
                )}
              </div>

              {selectedItem.messageId && (
                <div>
                  <span className="text-xs text-muted-foreground">Message ID</span>
                  <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs">
                    {selectedItem.messageId}
                  </code>
                </div>
              )}

              {selectedItem.error && (
                <div>
                  <span className="text-xs text-muted-foreground">Error</span>
                  <div className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                    {selectedItem.error}
                  </div>
                </div>
              )}

              {selectedItem.errorDetails && (
                <div>
                  <span className="text-xs text-muted-foreground">Error Details</span>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedItem.errorDetails, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="block">Created</span>
                  <span>{formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })}</span>
                </div>
                {selectedItem.sentAt && (
                  <div>
                    <span className="block">Sent</span>
                    <span>{formatDistanceToNow(new Date(selectedItem.sentAt), { addSuffix: true })}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedItem?.status === 'FAILED' && selectedItem.attempts < selectedItem.maxAttempts && (
              <Button
                onClick={() => {
                  handleRetry(selectedItem.id);
                  setViewDialogOpen(false);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Now
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

