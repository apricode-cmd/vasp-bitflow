/**
 * Admin Audit & System Logs Page
 * 
 * Comprehensive logging with Audit Logs, System Logs, and IP Management
 */

'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  FileText, 
  Filter, 
  RefreshCw, 
  Search, 
  Activity,
  User,
  Shield,
  ShieldOff,
  Settings,
  ShoppingCart,
  Wallet,
  Database,
  BarChart3,
  Monitor,
  Smartphone,
  Bot,
  Globe,
  Ban,
  CheckCircle2
} from 'lucide-react';

// Types
interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue: any;
  newValue: any;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
}

interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  entityType: string;
  entityId: string;
  diffBefore: any;
  diffAfter: any;
  context: any;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  mfaRequired: boolean;
  mfaMethod: string | null;
  createdAt: string;
}

interface UserAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  diffBefore: any;
  diffAfter: any;
  context: any;
  mfaRequired: boolean;
  mfaMethod: string | null;
  createdAt: string;
}

interface SystemLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  action: string;
  method: string | null;
  path: string;
  statusCode: number | null;
  ipAddress: string;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  isMobile: boolean;
  isBot: boolean;
  responseTime: number | null;
  errorMessage: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
}

interface Statistics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByEntity: Record<string, number>;
  topUsers: Array<{ userId: string; email: string; actionCount: number }>;
}

// Entity icons
const getEntityIcon = (entity: string) => {
  switch (entity) {
    case 'User': return User;
    case 'Order': return ShoppingCart;
    case 'PlatformWallet':
    case 'UserWallet': return Wallet;
    case 'SystemSettings': return Settings;
    default: return Database;
  }
};

// Device icons
const getDeviceIcon = (deviceType: string | null) => {
  if (!deviceType) return Monitor;
  switch (deviceType) {
    case 'mobile': return Smartphone;
    case 'tablet': return Smartphone;
    default: return Monitor;
  }
};

// Action badge variants
const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  if (action.includes('CREATED') || action.includes('APPROVED') || action.includes('SUCCESS')) return 'default';
  if (action.includes('UPDATED')) return 'secondary';
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('ERROR') || action.includes('FAILED')) return 'destructive';
  return 'outline';
};

// Status code badge variant
const getStatusVariant = (code: number | null): "default" | "secondary" | "destructive" => {
  if (!code) return 'secondary';
  if (code >= 200 && code < 300) return 'default';
  if (code >= 400) return 'destructive';
  return 'secondary';
};

export default function AuditPage(): JSX.Element {
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [adminLogs, setAdminLogs] = React.useState<AdminAuditLog[]>([]);
  const [userLogs, setUserLogs] = React.useState<UserAuditLog[]>([]);
  const [criticalLogs, setCriticalLogs] = React.useState<AdminAuditLog[]>([]);
  const [systemLogs, setSystemLogs] = React.useState<SystemLog[]>([]);
  const [stats, setStats] = React.useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('admin');

  // Block IP Dialog
  const [blockDialogOpen, setBlockDialogOpen] = React.useState(false);
  const [ipToBlock, setIpToBlock] = React.useState('');
  const [blockReason, setBlockReason] = React.useState('');

  const [filters, setFilters] = React.useState({
    action: '',
    entity: '',
    userId: '',
    ipAddress: '',
    deviceType: '',
    search: ''
  });

  const [pagination, setPagination] = React.useState({
    total: 0,
    limit: 50,
    offset: 0
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminLogs();
    } else if (activeTab === 'user') {
      fetchUserLogs();
    } else if (activeTab === 'critical') {
      fetchCriticalLogs();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'system') {
      fetchSystemLogs();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [filters, pagination.offset, activeTab]);

  const fetchData = async () => {
    await Promise.all([fetchAdminLogs(), fetchStats()]);
  };

  const fetchAdminLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entityType', filters.entity);
      if (filters.userId) params.append('adminId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/audit/admin-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setAdminLogs(data.logs);
        setPagination({
          ...pagination,
          total: data.pagination.total
        });
      } else {
        toast.error('Failed to fetch admin logs');
      }
    } catch (error) {
      console.error('Fetch admin logs error:', error);
      toast.error('Failed to fetch admin logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchUserLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entityType', filters.entity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/audit/user-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setUserLogs(data.logs);
        setPagination({
          ...pagination,
          total: data.pagination.total
        });
      } else {
        toast.error('Failed to fetch user logs');
      }
    } catch (error) {
      console.error('Fetch user logs error:', error);
      toast.error('Failed to fetch user logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchCriticalLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      params.append('severity', 'CRITICAL');
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entityType', filters.entity);
      if (filters.userId) params.append('adminId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/audit/admin-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setCriticalLogs(data.logs);
        setPagination({
          ...pagination,
          total: data.pagination.total
        });
      } else {
        toast.error('Failed to fetch critical logs');
      }
    } catch (error) {
      console.error('Fetch critical logs error:', error);
      toast.error('Failed to fetch critical logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/audit?${params}`);
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data);
        setPagination({
          ...pagination,
          total: data.pagination.total
        });
      } else {
        toast.error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      if (filters.deviceType) params.append('deviceType', filters.deviceType);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/system-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setSystemLogs(data.data);
        setPagination({
          ...pagination,
          total: data.pagination.total
        });
      } else {
        toast.error('Failed to fetch system logs');
      }
    } catch (error) {
      console.error('Fetch system logs error:', error);
      toast.error('Failed to fetch system logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/audit/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'admin') {
      await fetchAdminLogs();
    } else if (activeTab === 'user') {
      await fetchUserLogs();
    } else if (activeTab === 'critical') {
      await fetchCriticalLogs();
    } else if (activeTab === 'audit') {
      await fetchAuditLogs();
    } else if (activeTab === 'system') {
      await fetchSystemLogs();
    } else if (activeTab === 'stats') {
      await fetchStats();
    }
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setIsSheetOpen(true);
  };

  const handleFilterReset = () => {
    setFilters({
      action: '',
      entity: '',
      userId: '',
      ipAddress: '',
      deviceType: '',
      search: ''
    });
    setPagination({ ...pagination, offset: 0 });
  };

  const handleBlockIP = (ip: string) => {
    setIpToBlock(ip);
    setBlockReason('');
    setBlockDialogOpen(true);
  };

  const confirmBlockIP = async () => {
    if (!ipToBlock || !blockReason.trim()) {
      toast.error('Please provide a reason for blocking');
      return;
    }

    try {
      const response = await fetch('/api/admin/ip-blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ipToBlock,
          reason: blockReason
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`IP ${ipToBlock} has been blocked`);
        setBlockDialogOpen(false);
        handleRefresh();
      } else {
        toast.error(data.error || 'Failed to block IP');
      }
    } catch (error) {
      console.error('Block IP error:', error);
      toast.error('Failed to block IP');
    }
  };

  // Filter logs by search
  const filteredAuditLogs = React.useMemo(() => {
    if (!filters.search) return auditLogs;
    
    const searchLower = filters.search.toLowerCase();
    return auditLogs.filter(log => 
      log.action.toLowerCase().includes(searchLower) ||
      log.entity.toLowerCase().includes(searchLower) ||
      log.entityId.toLowerCase().includes(searchLower) ||
      log.user?.email.toLowerCase().includes(searchLower) ||
      log.ipAddress?.toLowerCase().includes(searchLower)
    );
  }, [auditLogs, filters.search]);

  const filteredSystemLogs = React.useMemo(() => {
    if (!filters.search) return systemLogs;
    
    const searchLower = filters.search.toLowerCase();
    return systemLogs.filter(log => 
      log.action.toLowerCase().includes(searchLower) ||
      log.path.toLowerCase().includes(searchLower) ||
      log.user?.email.toLowerCase().includes(searchLower) ||
      log.ipAddress.toLowerCase().includes(searchLower)
    );
  }, [systemLogs, filters.search]);

  const auditColumns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Time',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">
            {new Date(row.original.createdAt).toLocaleTimeString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const log = row.original;
        return log.user ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">{log.user.email}</div>
            <Badge variant="outline" className="text-xs">
              {log.user.role}
            </Badge>
          </div>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <Settings className="h-3 w-3" />
            SYSTEM
          </Badge>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge variant={getActionVariant(row.original.action)}>
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: 'entity',
      header: 'Entity',
      cell: ({ row }) => {
        const EntityIcon = getEntityIcon(row.original.entity);
        return (
          <div className="flex items-center gap-2">
            <EntityIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{row.original.entity}</div>
              <code className="text-xs text-muted-foreground">
                {row.original.entityId.slice(0, 8)}...
              </code>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground font-mono">
          {row.original.ipAddress || 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleViewDetails(row.original)}
        >
          <FileText className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const systemColumns: ColumnDef<SystemLog>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Time',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">
            {new Date(row.original.createdAt).toLocaleTimeString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const log = row.original;
        return log.user ? (
          <div className="space-y-1">
            <div className="text-sm font-medium truncate max-w-[150px]">{log.user.email}</div>
            <Badge variant="outline" className="text-xs">
              {log.user.role}
            </Badge>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">Anonymous</Badge>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge variant={getActionVariant(row.original.action)} className="font-mono text-xs">
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: 'path',
      header: 'Path',
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <code className="text-xs truncate block">{row.original.path}</code>
          {row.original.method && (
            <Badge variant="outline" className="text-xs mt-1">
              {row.original.method}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'device',
      header: 'Device',
      cell: ({ row }) => {
        const DeviceIcon = getDeviceIcon(row.original.deviceType);
        return (
          <div className="flex items-center gap-2">
            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              {row.original.isBot ? (
                <Badge variant="secondary" className="gap-1">
                  <Bot className="h-3 w-3" />
                  Bot
                </Badge>
              ) : (
                <div>
                  <div className="font-medium">{row.original.browser || 'Unknown'}</div>
                  <div className="text-muted-foreground">{row.original.os || 'Unknown'}</div>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP & Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-mono">{row.original.ipAddress}</div>
          {row.original.statusCode && (
            <Badge variant={getStatusVariant(row.original.statusCode)} className="text-xs">
              {row.original.statusCode}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleViewDetails(row.original)}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleBlockIP(row.original.ipAddress)}
            className="text-destructive hover:text-destructive"
          >
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Audit & System Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive tracking of all system activities and admin actions
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="icon"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="admin" className="gap-2">
            <Shield className="h-4 w-4" />
            Admin Log
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-2">
            <User className="h-4 w-4" />
            User Log
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-2">
            <ShieldOff className="h-4 w-4 text-destructive" />
            Critical Actions
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Audit Logs (Legacy)
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Activity className="h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Input
                    placeholder="e.g., ORDER_CREATED"
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entity</Label>
                  <Select
                    value={filters.entity || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, entity: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entities</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Order">Order</SelectItem>
                      <SelectItem value="KycSession">KYC Session</SelectItem>
                      <SelectItem value="TradingPair">Trading Pair</SelectItem>
                      <SelectItem value="PlatformWallet">Platform Wallet</SelectItem>
                      <SelectItem value="SystemSettings">System Settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input
                    placeholder="e.g., 192.168.1.1"
                    value={filters.ipAddress}
                    onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="Filter by user..."
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleFilterReset}>
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <DataTable
            columns={auditColumns}
            data={filteredAuditLogs}
            isLoading={isLoading}
            searchKey="action"
            searchPlaceholder="Search actions..."
          />
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="system" className="space-y-4 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter system logs by action, user, device type, or IP address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Input
                    placeholder="e.g., LOGIN_SUCCESS"
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Device Type</Label>
                  <Select
                    value={filters.deviceType || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, deviceType: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All devices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All devices</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input
                    placeholder="e.g., 192.168.1.1"
                    value={filters.ipAddress}
                    onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="Filter by user..."
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleFilterReset}>
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <DataTable
            columns={systemColumns}
            data={filteredSystemLogs}
            isLoading={isLoading}
            searchKey="action"
            searchPlaceholder="Search actions..."
          />
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4 mt-6">
          {stats ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalActions.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Action Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Object.keys(stats.actionsByType).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique action types
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {stats.topUsers.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Users with activity
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions by Type</CardTitle>
                  <CardDescription>Most common actions in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.actionsByType)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between">
                          <Badge variant={getActionVariant(action)}>
                            {action}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions by Entity */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions by Entity</CardTitle>
                  <CardDescription>Activity distribution across entities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.actionsByEntity)
                      .sort(([, a], [, b]) => b - a)
                      .map(([entity, count]) => {
                        const EntityIcon = getEntityIcon(entity);
                        const total = stats.totalActions;
                        const percentage = ((count / total) * 100).toFixed(1);

                        return (
                          <div key={entity} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <EntityIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{entity}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{count}</span>
                                <span className="text-xs text-muted-foreground">({percentage}%)</span>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Active Users</CardTitle>
                  <CardDescription>Users with the highest activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topUsers.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{user.email}</div>
                            <div className="text-xs text-muted-foreground">{user.userId}</div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {user.actionCount} actions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Log Details</SheetTitle>
            <SheetDescription>
              Complete information about this log entry
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="space-y-6 mt-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <div className="text-sm font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ({formatRelativeTime(selectedLog.createdAt)})
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  {selectedLog.user ? (
                    <div className="space-y-1 mt-1">
                      <div className="text-sm font-medium">{selectedLog.user.email}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selectedLog.user.role}</Badge>
                        <code className="text-xs text-muted-foreground">{selectedLog.user.id}</code>
                      </div>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="mt-1">SYSTEM / Anonymous</Badge>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <div className="mt-1">
                    <Badge variant={getActionVariant(selectedLog.action)} className="text-sm">
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>

                {selectedLog.entity && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Entity</Label>
                      <div className="text-sm font-medium mt-1">{selectedLog.entity}</div>
                      <code className="text-xs text-muted-foreground block mt-1">
                        ID: {selectedLog.entityId}
                      </code>
                    </div>
                  </>
                )}

                {selectedLog.path && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Path</Label>
                      <code className="text-sm block mt-1">{selectedLog.path}</code>
                      {selectedLog.method && (
                        <Badge variant="outline" className="mt-1">{selectedLog.method}</Badge>
                      )}
                      {selectedLog.statusCode && (
                        <Badge variant={getStatusVariant(selectedLog.statusCode)} className="mt-1 ml-2">
                          {selectedLog.statusCode}
                        </Badge>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">IP Address</Label>
                  <div className="text-sm font-mono mt-1 flex items-center gap-2">
                    {selectedLog.ipAddress || 'N/A'}
                    {selectedLog.ipAddress && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBlockIP(selectedLog.ipAddress)}
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Block
                      </Button>
                    )}
                  </div>
                </div>

                {selectedLog.deviceType && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Device Info</Label>
                      <div className="mt-1 space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Type:</span> {selectedLog.deviceType}
                        </div>
                        {selectedLog.browser && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Browser:</span> {selectedLog.browser} {selectedLog.browserVersion}
                          </div>
                        )}
                        {selectedLog.os && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">OS:</span> {selectedLog.os}
                          </div>
                        )}
                        {selectedLog.isBot && (
                          <Badge variant="secondary" className="gap-1">
                            <Bot className="h-3 w-3" />
                            Bot Detected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedLog.userAgent && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">User Agent</Label>
                      <div className="text-xs text-muted-foreground mt-1 break-all">
                        {selectedLog.userAgent}
                      </div>
                    </div>
                  </>
                )}

                {selectedLog.responseTime && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Response Time</Label>
                      <div className="text-sm font-medium mt-1">
                        {selectedLog.responseTime}ms
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Changes */}
              {(selectedLog.oldValue || selectedLog.newValue) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Changes</Label>
                    
                    {selectedLog.oldValue && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Old Value</Label>
                        <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedLog.newValue && (
                      <div>
                        <Label className="text-xs text-muted-foreground">New Value</Label>
                        <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Error Info */}
              {selectedLog.errorMessage && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-destructive">Error Details</Label>
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <div className="text-sm text-destructive">
                        {selectedLog.errorMessage}
                      </div>
                      {selectedLog.errorStack && (
                        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                          {selectedLog.errorStack}
                        </pre>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-semibold">Metadata</Label>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Block IP Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Block IP Address
            </DialogTitle>
            <DialogDescription>
              Block <code className="font-mono">{ipToBlock}</code> from accessing the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for blocking *</Label>
              <Textarea
                id="reason"
                placeholder="Describe why this IP should be blocked (e.g., suspicious activity, multiple failed login attempts, bot detected)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmBlockIP}
              disabled={!blockReason.trim()}
            >
              <Ban className="h-4 w-4 mr-2" />
              Block IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
