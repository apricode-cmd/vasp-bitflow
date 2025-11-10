/**
 * Admin Notifications Center
 * 
 * View critical system events and admin actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  Shield, 
  AlertTriangle, 
  Info, 
  RefreshCw,
  User,
  ShoppingCart,
  Key,
  Settings,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface AdminNotification {
  id: string;
  action: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actionUrl?: string | null;
  adminEmail: string;
  adminRole: string;
  createdAt: string;
  metadata?: any;
}

export default function AdminNotificationsPage(): React.ReactElement {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning'>('all');
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0
  });

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications?limit=100');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        
        // Calculate stats
        const critical = data.notifications.filter((n: AdminNotification) => n.severity === 'CRITICAL').length;
        const warning = data.notifications.filter((n: AdminNotification) => n.severity === 'WARNING').length;
        const info = data.notifications.filter((n: AdminNotification) => n.severity === 'INFO').length;
        
        setStats({
          total: data.notifications.length,
          critical,
          warning,
          info
        });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle notification click
  const handleNotificationClick = (notification: AdminNotification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  // Get notification icon
  const getNotificationIcon = (action: string) => {
    if (action.includes('ADMIN_')) {
      return <Shield className="h-5 w-5" />;
    } else if (action.includes('ORDER_')) {
      return <ShoppingCart className="h-5 w-5" />;
    } else if (action.includes('USER_')) {
      return <User className="h-5 w-5" />;
    } else if (action.includes('API_KEY_')) {
      return <Key className="h-5 w-5" />;
    } else if (action.includes('PAYMENT_')) {
      return <CreditCard className="h-5 w-5" />;
    } else if (action.includes('SETTINGS_') || action.includes('INTEGRATION_')) {
      return <Settings className="h-5 w-5" />;
    }
    return <Bell className="h-5 w-5" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'INFO':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4" />;
      case 'INFO':
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const filteredNotifications = 
    activeTab === 'critical' ? notifications.filter(n => n.severity === 'CRITICAL') :
    activeTab === 'warning' ? notifications.filter(n => n.severity === 'WARNING') :
    notifications;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Monitor critical system events and admin actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.warning}</div>
            <p className="text-xs text-muted-foreground mt-1">Review recommended</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
            <p className="text-xs text-muted-foreground mt-1">Informational</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({stats.critical})
          </TabsTrigger>
          <TabsTrigger value="warning">
            Warning ({stats.warning})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {loading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            // Empty state
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === 'critical' ? 'No critical events' : 
                   activeTab === 'warning' ? 'No warning events' : 
                   'No notifications yet'}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'all' 
                    ? 'System events and admin actions will appear here.'
                    : `No ${activeTab} events in the last 24 hours.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            // Notifications list
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`cursor-pointer transition hover:shadow-md border ${getSeverityColor(notification.severity)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${getSeverityColor(notification.severity)}`}>
                        {getNotificationIcon(notification.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge variant="outline" className={`h-5 px-2 text-xs flex items-center gap-1 ${getSeverityColor(notification.severity)}`}>
                              {getSeverityIcon(notification.severity)}
                              {notification.severity}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{notification.adminEmail}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>{notification.adminRole}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

