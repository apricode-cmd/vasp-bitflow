/**
 * ActivityTab Component
 * 
 * Displays complete audit log for user (Client Actions Log)
 * Shows all user activities from /admin/audit
 */

'use client';

import { useState, useEffect } from 'react';
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import { ArrowUpDown, Eye, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  context: any;
  ipAddress: string | null;
  userAgent: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
}

interface ActivityTabProps {
  userId: string;
}

export function ActivityTab({ userId }: ActivityTabProps): JSX.Element {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [userId]);

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/activity`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
      } else {
        toast.error('Failed to fetch activity logs');
      }
    } catch (error) {
      console.error('Fetch activity logs error:', error);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: 'action',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Action
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const action = row.original.action;
        const actionColors: Record<string, string> = {
          USER_LOGIN: 'text-green-600 dark:text-green-400',
          USER_LOGOUT: 'text-gray-600 dark:text-gray-400',
          USER_REGISTER: 'text-blue-600 dark:text-blue-400',
          PROFILE_UPDATE: 'text-yellow-600 dark:text-yellow-400',
          PASSWORD_CHANGE: 'text-orange-600 dark:text-orange-400',
          KYC_SUBMIT: 'text-purple-600 dark:text-purple-400',
          ORDER_CREATE: 'text-green-600 dark:text-green-400',
          ORDER_CANCEL: 'text-red-600 dark:text-red-400',
        };
        return (
          <span className={`font-medium ${actionColors[action] || ''}`}>
            {action.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'entityType',
      header: 'Entity',
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.entityType}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'entityId',
      header: 'Entity ID',
      cell: ({ row }) => {
        const entityId = row.original.entityId;
        if (!entityId) return <span className="text-muted-foreground text-xs">-</span>;
        const short = `${entityId.slice(0, 8)}...`;
        return (
          <span className="font-mono text-xs" title={entityId}>
            {short}
          </span>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => {
        const log = row.original;
        if (!log.ipAddress) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{log.ipAddress}</span>
            {(log.city || log.country) && (
              <span className="text-xs text-muted-foreground">
                {log.city}, {log.country}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'userAgent',
      header: 'Device',
      cell: ({ row }) => {
        const userAgent = row.original.userAgent;
        if (!userAgent) return <span className="text-muted-foreground text-xs">-</span>;
        
        // Simple parsing for display
        let device = 'Unknown';
        if (userAgent.includes('Mobile')) device = '📱 Mobile';
        else if (userAgent.includes('Tablet')) device = '📱 Tablet';
        else device = '💻 Desktop';

        let browser = '';
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';

        return (
          <div className="flex flex-col">
            <span className="text-xs">{device}</span>
            {browser && <span className="text-xs text-muted-foreground">{browser}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(new Date(row.original.createdAt))}
          </span>
        );
      },
    },
    {
      id: 'details',
      header: 'Details',
      cell: ({ row }) => {
        const log = row.original;
        const hasChanges = (log.changes && Object.keys(log.changes).length > 0) || 
                          (log.context && Object.keys(log.context).length > 0);
        
        if (!hasChanges) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }

        return (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              // TODO: Open details dialog
              toast.info('Details dialog coming soon');
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {logs.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No activity logs yet</p>
        </div>
      ) : (
        <DataTableAdvanced
          columns={columns}
          data={logs}
          isLoading={loading}
          searchKey="action"
          searchPlaceholder="Search by action..."
          pageSize={20}
          enableExport={true}
          exportFileName={`user-${userId}-activity-log`}
        />
      )}
    </div>
  );
}

