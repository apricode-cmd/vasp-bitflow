/**
 * Admin Audit Log Page
 * 
 * View and filter audit logs
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRelativeTime } from '@/lib/formatters';
import { toast } from 'sonner';

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
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
}

export default function AuditLogPage(): JSX.Element {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    userId: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.offset]);

  const fetchLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.userId) params.append('userId', filters.userId);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/audit?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
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
      setLoading(false);
    }
  };

  const nextPage = (): void => {
    setPagination({
      ...pagination,
      offset: pagination.offset + pagination.limit
    });
  };

  const prevPage = (): void => {
    setPagination({
      ...pagination,
      offset: Math.max(0, pagination.offset - pagination.limit)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions and user activities</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Action</label>
            <Input
              placeholder="e.g., ORDER_CREATED"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Entity</label>
            <Input
              placeholder="e.g., Order"
              value={filters.entity}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">User ID</label>
            <Input
              placeholder="User ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Entity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {formatRelativeTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <div className="text-sm font-medium">{log.user.email}</div>
                            <Badge variant="secondary" className="text-xs">
                              {log.user.role}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary">SYSTEM</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.action}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{log.entity}</div>
                        <div className="text-xs text-muted-foreground">{log.entityId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.ipAddress || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={pagination.offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

