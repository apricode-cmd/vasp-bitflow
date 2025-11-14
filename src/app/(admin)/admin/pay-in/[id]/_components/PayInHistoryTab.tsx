/**
 * PayIn History Tab Component
 * Displays audit log and status changes for a PayIn
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/formatters';
import { 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileEdit,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  performedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  changes: Record<string, any> | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  context: Record<string, any> | null;
  admin: {
    email: string;
  } | null;
}

interface PayInHistoryTabProps {
  payInId: string;
}

const actionIcons: Record<string, any> = {
  'PAYIN_CREATED': <Clock className="h-4 w-4" />,
  'PAYIN_UPDATED': <FileEdit className="h-4 w-4" />,
  'PAYIN_VERIFIED': <CheckCircle className="h-4 w-4 text-green-600" />,
  'PAYIN_RECONCILED': <CheckCircle className="h-4 w-4 text-blue-600" />,
  'PAYIN_FAILED': <XCircle className="h-4 w-4 text-red-600" />,
};

export function PayInHistoryTab({ payInId }: PayInHistoryTabProps): JSX.Element {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [payInId]);

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/audit?entityType=PAYIN&entityId=${payInId}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
      } else {
        toast.error('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Fetch audit logs error:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No activity logs yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Timeline ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-border" />

            {logs.map((log, index) => (
              <div key={log.id} className="relative flex gap-4 pb-4">
                {/* Icon */}
                <div className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-border">
                  {actionIcons[log.action] || <Activity className="h-3 w-3" />}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.action.replace('PAYIN_', '')}</Badge>
                      <span className="text-sm text-muted-foreground">
                        by {log.admin?.email || log.performedBy}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(new Date(log.performedAt))}
                    </span>
                  </div>

                  {/* Changes */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                      {Object.entries(log.changes).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="font-medium min-w-[120px]">{key}:</span>
                          <span className="flex-1">
                            {log.oldValues?.[key] && (
                              <span className="text-red-600 line-through mr-2">
                                {String(log.oldValues[key])}
                              </span>
                            )}
                            <span className="text-green-600 font-medium">
                              {String(value)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Context */}
                  {log.context && Object.keys(log.context).length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(log.context).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IP & User Agent */}
                  {(log.ipAddress || log.userAgent) && (
                    <div className="text-xs text-muted-foreground">
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      {log.ipAddress && log.userAgent && <span className="mx-2">•</span>}
                      {log.userAgent && (
                        <span className="truncate max-w-[300px] inline-block">
                          {log.userAgent}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

