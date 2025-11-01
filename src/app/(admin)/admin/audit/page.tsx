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

interface MfaEvent {
  id: string;
  actorId: string;
  actorType: 'ADMIN' | 'USER';
  actionType: string; // 'STEPUP' | 'LOGIN' | 'REGISTER'
  method: string; // 'WEBAUTHN' | 'TOTP'
  uv: boolean | null; // userVerification
  credentialIdHash: string | null;
  aaguid: string | null;
  signCount: number | null;
  challengeId: string | null;
  result: string; // 'success' | 'fail'
  errorCode: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: any;
  createdAt: string;
  // Relations for display
  admin?: {
    email: string;
    roleCode: string;
  };
  user?: {
    email: string;
    role: string;
  };
}

interface SystemLog {
  id: string;
  orgId: string | null;
  source: string | null; // 'KYCAID_WEBHOOK' | 'RAPYD_WEBHOOK' | 'NODE'
  level: string | null; // 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
  eventType: string | null; // 'WEBHOOK_RECEIVED' | 'API_CALL'
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  payload: any;
  requestBody: any;
  responseBody: any;
  errorMessage: string | null;
  errorStack: string | null;
  responseTime: number | null;
  metadata: any;
  createdAt: string;
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
  const [adminLogs, setAdminLogs] = React.useState<AdminAuditLog[]>([]);
  const [userLogs, setUserLogs] = React.useState<UserAuditLog[]>([]);
  const [criticalLogs, setCriticalLogs] = React.useState<AdminAuditLog[]>([]);
  const [mfaEvents, setMfaEvents] = React.useState<MfaEvent[]>([]);
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

  const fetchMfaEvents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filters.userId) params.append('actorId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/audit/mfa-events?${params}`);
      const data = await response.json();

      if (data.success) {
        setMfaEvents(data.data.events);
        setPagination({
          ...pagination,
          total: data.data.total
        });
      } else {
        toast.error('Failed to fetch MFA events');
      }
    } catch (error) {
      console.error('Fetch MFA events error:', error);
      toast.error('Failed to fetch MFA events');
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

  // Filter system logs by search
  const filteredSystemLogs = React.useMemo(() => {
    if (!filters.search) return systemLogs;
    
    const searchLower = filters.search.toLowerCase();
    return systemLogs.filter(log => 
      (log.source && log.source.toLowerCase().includes(searchLower)) ||
      (log.eventType && log.eventType.toLowerCase().includes(searchLower)) ||
      (log.endpoint && log.endpoint.toLowerCase().includes(searchLower)) ||
      (log.level && log.level.toLowerCase().includes(searchLower))
    );
  }, [systemLogs, filters.search]);

  // Admin audit log columns
  const adminAuditColumns: ColumnDef<AdminAuditLog>[] = [
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
      accessorKey: 'admin',
      header: 'Administrator',
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">{log.adminEmail}</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {log.adminRole}
              </Badge>
            </div>
            <code className="text-xs text-muted-foreground">
              ID: {log.adminId.slice(0, 8)}...
            </code>
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={getActionVariant(row.original.action)}>
            {row.original.action}
          </Badge>
          {row.original.mfaRequired && (
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <Shield className="h-3 w-3" />
                MFA: {row.original.mfaMethod}
              </Badge>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Entity',
      cell: ({ row }) => {
        const EntityIcon = getEntityIcon(row.original.entityType);
        return (
          <div className="flex items-center gap-2">
            <EntityIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{row.original.entityType}</div>
              <code className="text-xs text-muted-foreground">
                {row.original.entityId.slice(0, 8)}...
              </code>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const severity = row.original.severity;
        const variant = severity === 'CRITICAL' ? 'destructive' : severity === 'WARNING' ? 'default' : 'secondary';
        return (
          <Badge variant={variant} className="text-xs">
            {severity}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'context',
      header: 'IP Address',
      cell: ({ row }) => {
        const context = row.original.context as any;
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {context?.ipAddress || 'N/A'}
          </span>
        );
      },
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

  // User audit log columns
  const userAuditColumns: ColumnDef<UserAuditLog>[] = [
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
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-blue-500" />
              <span className="text-sm font-medium">Client</span>
            </div>
            <div className="text-xs text-muted-foreground">{log.userEmail}</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {log.userRole}
              </Badge>
              <code className="text-xs text-muted-foreground">
                {log.userId.slice(0, 8)}...
              </code>
            </div>
          </div>
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
      accessorKey: 'entityType',
      header: 'Entity',
      cell: ({ row }) => {
        const EntityIcon = getEntityIcon(row.original.entityType);
        return (
          <div className="flex items-center gap-2">
            <EntityIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{row.original.entityType}</div>
              <code className="text-xs text-muted-foreground">
                {row.original.entityId.slice(0, 8)}...
              </code>
            </div>
          </div>
        );
      },
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

  // MFA Events columns for Critical Actions tab
  const mfaEventColumns: ColumnDef<MfaEvent>[] = [
    {
      accessorKey: 'ts',
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
      accessorKey: 'actor',
      header: 'Actor',
      cell: ({ row }) => {
        const event = row.original;
        const isAdmin = event.actorType === 'ADMIN';
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <Shield className="h-3 w-3 text-purple-500" />
                  <span className="text-sm font-medium">Admin</span>
                </>
              ) : (
                <>
                  <User className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-medium">Client</span>
                </>
              )}
            </div>
            <code className="text-xs text-muted-foreground">
              {event.actorId.slice(0, 8)}...
            </code>
          </div>
        );
      },
    },
    {
      accessorKey: 'actionType',
      header: 'Action Type',
      cell: ({ row }) => {
        const variant = row.original.actionType === 'STEPUP' 
          ? 'destructive' 
          : row.original.actionType === 'LOGIN' 
          ? 'default' 
          : 'secondary';
        return (
          <Badge variant={variant}>
            {row.original.actionType}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.method}
          {row.original.uv && <span className="ml-1 text-green-600">✓ UV</span>}
        </Badge>
      ),
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }) => {
        const isSuccess = row.original.result === 'SUCCESS';
        return (
          <Badge variant={isSuccess ? 'default' : 'destructive'}>
            {isSuccess ? '✓ Success' : '✗ Failed'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => (
        <code className="text-xs">
          {row.original.ipAddress || 'N/A'}
        </code>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground space-y-1">
          {row.original.credentialIdHash && (
            <div>Cred: {row.original.credentialIdHash.slice(0, 8)}...</div>
          )}
          {row.original.signCount !== null && (
            <div>Sign Count: {row.original.signCount}</div>
          )}
          {row.original.errorCode && (
            <div className="text-red-600">Error: {row.original.errorCode}</div>
          )}
        </div>
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
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs font-mono">
          {row.original.source || 'N/A'}
        </Badge>
      ),
    },
    {
      accessorKey: 'eventType',
      header: 'Event Type',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {row.original.eventType || 'N/A'}
        </Badge>
      ),
    },
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <code className="text-xs truncate block">{row.original.endpoint || 'N/A'}</code>
          {row.original.method && (
            <Badge variant="outline" className="text-xs mt-1">
              {row.original.method}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: ({ row }) => {
        const level = row.original.level;
        const variant = level === 'CRITICAL' || level === 'ERROR' ? 'destructive' : level === 'WARN' ? 'default' : 'secondary';
        return (
          <Badge variant={variant} className="text-xs">
            {level || 'INFO'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'statusCode',
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.statusCode && (
            <Badge variant={getStatusVariant(row.original.statusCode)} className="text-xs">
              {row.original.statusCode}
            </Badge>
          )}
          {row.original.responseTime && (
            <div className="text-xs text-muted-foreground">
              {row.original.responseTime}ms
            </div>
          )}
        </div>
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
          <TabsTrigger value="system" className="gap-2">
            <Activity className="h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Admin Log Tab */}
        <TabsContent value="admin" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Administrator Actions Log
              </CardTitle>
              <CardDescription>
                All actions performed by administrators with MFA tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={adminAuditColumns}
                data={adminLogs}
                isLoading={isLoading}
                searchKey="action"
                searchPlaceholder="Search admin actions..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Log Tab */}
        <TabsContent value="user" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Actions Log
              </CardTitle>
              <CardDescription>
                All actions performed by clients (users)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={userAuditColumns}
                data={userLogs}
                isLoading={isLoading}
                searchKey="action"
                searchPlaceholder="Search user actions..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Critical Actions Tab */}
        <TabsContent value="critical" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldOff className="h-5 w-5" />
                Critical Actions & MFA Events
              </CardTitle>
              <CardDescription>
                High-risk actions and authentication events requiring MFA verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="critical-actions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="critical-actions">Critical Actions</TabsTrigger>
                  <TabsTrigger value="mfa-events">MFA Events</TabsTrigger>
                </TabsList>
                
                <TabsContent value="critical-actions" className="mt-6">
                  {criticalLogs.length === 0 && !isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-lg font-semibold">No Critical Actions</p>
                      <p className="text-sm">All systems operating normally</p>
                    </div>
                  ) : (
                    <DataTable
                      columns={adminAuditColumns}
                      data={criticalLogs}
                      isLoading={isLoading}
                      searchKey="action"
                      searchPlaceholder="Search critical actions..."
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="mfa-events" className="mt-6">
                  <DataTable
                    columns={mfaEventColumns}
                    data={mfaEvents}
                    isLoading={isLoading}
                    searchKey="actionType"
                    searchPlaceholder="Search MFA events..."
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
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

      {/* Details Sheet - Enhanced for new audit system */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Details</SheetTitle>
            <SheetDescription>
              Complete compliance information about this entry
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="space-y-6 mt-6">
              {/* Timestamp & ID */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Entry Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Log ID</Label>
                    <code className="text-xs block mt-1">{selectedLog.id}</code>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Timestamp</Label>
                    <div className="text-sm font-medium mt-1">
                      {new Date(selectedLog.createdAt).toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'long'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ({formatRelativeTime(selectedLog.createdAt)})
                    </div>
                  </div>
                  {selectedLog.freezeChecksum && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          Integrity Checksum
                        </Label>
                        <code className="text-xs block mt-1 break-all">{selectedLog.freezeChecksum}</code>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actor Info - Admin or User */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {selectedLog.adminEmail ? 'Administrator' : 'User'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedLog.adminEmail ? (
                    // Admin log
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <div className="text-sm font-medium mt-1">{selectedLog.adminEmail}</div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <Badge variant="outline" className="mt-1">{selectedLog.adminRole}</Badge>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Admin ID</Label>
                        <code className="text-xs block mt-1">{selectedLog.adminId}</code>
                      </div>
                    </>
                  ) : selectedLog.userEmail ? (
                    // User log
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <div className="text-sm font-medium mt-1">{selectedLog.userEmail}</div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <Badge variant="outline" className="mt-1">{selectedLog.userRole}</Badge>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">User ID</Label>
                        <code className="text-xs block mt-1">{selectedLog.userId}</code>
                      </div>
                    </>
                  ) : (
                    <Badge variant="secondary">SYSTEM</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Action & Entity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Action Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Action</Label>
                    <div className="mt-1">
                      <Badge variant={getActionVariant(selectedLog.action)} className="text-sm">
                        {selectedLog.action}
                      </Badge>
                    </div>
                  </div>
                  {selectedLog.severity && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Severity Level</Label>
                        <div className="mt-1">
                          <Badge 
                            variant={selectedLog.severity === 'CRITICAL' ? 'destructive' : selectedLog.severity === 'WARNING' ? 'default' : 'secondary'}
                            className="text-sm"
                          >
                            {selectedLog.severity}
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                  {(selectedLog.entityType || selectedLog.entity) && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Entity Type</Label>
                        <div className="text-sm font-medium mt-1">{selectedLog.entityType || selectedLog.entity}</div>
                        <code className="text-xs text-muted-foreground block mt-1">
                          ID: {selectedLog.entityId}
                        </code>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* MFA Information */}
              {selectedLog.mfaRequired && (
                <Card className="border-amber-500/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      MFA Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Required</Label>
                      <Badge variant="default" className="mt-1">Yes</Badge>
                    </div>
                    {selectedLog.mfaMethod && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Method</Label>
                          <Badge variant="outline" className="mt-1">{selectedLog.mfaMethod}</Badge>
                        </div>
                      </>
                    )}
                    {selectedLog.mfaVerifiedAt && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Verified At</Label>
                          <div className="text-sm mt-1">
                            {new Date(selectedLog.mfaVerifiedAt).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedLog.mfaEventId && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">MFA Event ID</Label>
                          <code className="text-xs block mt-1">{selectedLog.mfaEventId}</code>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Changes (Before/After) */}
              {(selectedLog.diffBefore || selectedLog.diffAfter || selectedLog.oldValue || selectedLog.newValue) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Data Changes</CardTitle>
                    <CardDescription>Before and after values for this action</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(selectedLog.diffBefore || selectedLog.oldValue) && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Before</Label>
                        <pre className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.diffBefore || selectedLog.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {(selectedLog.diffAfter || selectedLog.newValue) && (
                      <>
                        {(selectedLog.diffBefore || selectedLog.oldValue) && <Separator />}
                        <div>
                          <Label className="text-xs text-muted-foreground">After</Label>
                          <pre className="mt-1 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(selectedLog.diffAfter || selectedLog.newValue, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Context & Metadata */}
              {selectedLog.context && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Context Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedLog.context.ipAddress && (
                      <div>
                        <Label className="text-xs text-muted-foreground">IP Address</Label>
                        <div className="text-sm font-mono mt-1 flex items-center gap-2">
                          {selectedLog.context.ipAddress}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleBlockIP(selectedLog.context.ipAddress)}
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Block
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedLog.context.userAgent && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">User Agent</Label>
                          <div className="text-xs text-muted-foreground mt-1 break-all">
                            {selectedLog.context.userAgent}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedLog.context.location && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Location</Label>
                          <div className="text-sm mt-1">
                            {selectedLog.context.location.country && `${selectedLog.context.location.country}, `}
                            {selectedLog.context.location.city}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedLog.context.device && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Device Info</Label>
                          <div className="text-xs mt-1">
                            {selectedLog.context.device.type && <div>Type: {selectedLog.context.device.type}</div>}
                            {selectedLog.context.device.browser && <div>Browser: {selectedLog.context.device.browser}</div>}
                            {selectedLog.context.device.os && <div>OS: {selectedLog.context.device.os}</div>}
                          </div>
                        </div>
                      </>
                    )}
                    {Object.keys(selectedLog.context).filter(k => !['ipAddress', 'userAgent', 'location', 'device'].includes(k)).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Additional Context</Label>
                          <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(selectedLog.context).filter(([k]) => 
                                  !['ipAddress', 'userAgent', 'location', 'device'].includes(k)
                                )
                              ),
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Compliance & Review */}
              {selectedLog.isReviewable && (
                <Card className="border-blue-500/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Compliance Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Requires Review</Label>
                      <Badge variant="default" className="mt-1">Yes</Badge>
                    </div>
                    {selectedLog.reviewedAt && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Reviewed At</Label>
                          <div className="text-sm mt-1">
                            {new Date(selectedLog.reviewedAt).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedLog.reviewedBy && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Reviewed By</Label>
                          <code className="text-xs block mt-1">{selectedLog.reviewedBy}</code>
                        </div>
                      </>
                    )}
                    {selectedLog.reviewNotes && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Review Notes</Label>
                          <p className="text-sm mt-1">{selectedLog.reviewNotes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* System Log specific fields */}
              {selectedLog.source && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">System Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Source</Label>
                      <Badge variant="outline" className="mt-1">{selectedLog.source}</Badge>
                    </div>
                    {selectedLog.level && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Level</Label>
                          <Badge 
                            variant={selectedLog.level === 'ERROR' || selectedLog.level === 'CRITICAL' ? 'destructive' : 'default'}
                            className="mt-1"
                          >
                            {selectedLog.level}
                          </Badge>
                        </div>
                      </>
                    )}
                    {selectedLog.endpoint && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Endpoint</Label>
                          <code className="text-xs block mt-1">{selectedLog.method} {selectedLog.endpoint}</code>
                        </div>
                      </>
                    )}
                    {selectedLog.statusCode && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Status Code</Label>
                          <Badge variant={getStatusVariant(selectedLog.statusCode)} className="mt-1">
                            {selectedLog.statusCode}
                          </Badge>
                        </div>
                      </>
                    )}
                    {selectedLog.responseTime && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Response Time</Label>
                          <div className="text-sm font-medium mt-1">{selectedLog.responseTime}ms</div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Error Information */}
              {selectedLog.errorMessage && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                  </CardContent>
                </Card>
              )}

              {/* Raw Metadata */}
              {selectedLog.metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Raw Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
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
