/**
 * KycHistoryTab
 * 
 * Displays KYC session history and audit log
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, Activity } from 'lucide-react';
import type { KycSessionDetail } from './types';
import { formatDateTime } from '@/lib/formatters';

interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  performedAt: Date;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface KycHistoryTabProps {
  session: KycSessionDetail;
}

export function KycHistoryTab({ session }: KycHistoryTabProps): JSX.Element {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [session.id]);

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      // TODO: Create API endpoint for KYC audit logs
      // For now, show session timeline from existing data
      const timeline: AuditLogEntry[] = [];

      if (session.createdAt) {
        timeline.push({
          id: 'created',
          action: 'KYC_SESSION_CREATED',
          performedBy: 'System',
          performedAt: new Date(session.createdAt),
          details: { status: 'NOT_STARTED' }
        });
      }

      if (session.submittedAt) {
        timeline.push({
          id: 'submitted',
          action: 'KYC_SUBMITTED',
          performedBy: session.user.email,
          performedAt: new Date(session.submittedAt),
          details: { provider: session.kycProviderId }
        });
      }

      if (session.reviewedAt) {
        timeline.push({
          id: 'reviewed',
          action: session.status === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
          performedBy: 'Admin', // TODO: Get actual admin from audit log
          performedAt: new Date(session.reviewedAt),
          details: { 
            status: session.status,
            rejectionReason: session.rejectionReason 
          }
        });
      }

      if (session.updatedAt && session.updatedAt !== session.createdAt) {
        timeline.push({
          id: 'updated',
          action: 'KYC_UPDATED',
          performedBy: 'System',
          performedAt: new Date(session.updatedAt),
          details: { status: session.status }
        });
      }

      // Sort by date (newest first)
      timeline.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

      setAuditLogs(timeline);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (action) {
      case 'KYC_SESSION_CREATED':
        return { label: 'Session Created', variant: 'secondary' };
      case 'KYC_SUBMITTED':
        return { label: 'Submitted for Review', variant: 'default' };
      case 'KYC_APPROVED':
        return { label: 'Approved', variant: 'default' };
      case 'KYC_REJECTED':
        return { label: 'Rejected', variant: 'destructive' };
      case 'KYC_UPDATED':
        return { label: 'Updated', variant: 'outline' };
      default:
        return { label: action, variant: 'secondary' };
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No history available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Activity Timeline
      </h3>

      <div className="space-y-6">
        {auditLogs.map((log, index) => {
          const action = getActionLabel(log.action);
          const isLast = index === auditLogs.length - 1;

          return (
            <div key={log.id} className="relative">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
              )}

              {/* Timeline Item */}
              <div className="flex gap-4">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {log.action.includes('APPROVED') && <Activity className="h-4 w-4 text-green-600" />}
                    {log.action.includes('REJECTED') && <Activity className="h-4 w-4 text-red-600" />}
                    {log.action.includes('SUBMITTED') && <User className="h-4 w-4 text-primary" />}
                    {!log.action.includes('APPROVED') && !log.action.includes('REJECTED') && !log.action.includes('SUBMITTED') && (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <Badge variant={action.variant} className="mb-2">
                        {action.label}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        by <span className="font-medium text-foreground">{log.performedBy}</span>
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.performedAt)}
                    </time>
                  </div>

                  {/* Details */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <div className="space-y-1 text-xs">
                        {log.details.status && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium">{log.details.status}</span>
                          </div>
                        )}
                        {log.details.provider && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Provider:</span>
                            <span className="font-medium">{log.details.provider}</span>
                          </div>
                        )}
                        {log.details.rejectionReason && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-muted-foreground">Reason:</span>
                            <p className="mt-1 text-xs text-destructive">{log.details.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {(log.ipAddress || log.userAgent) && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {log.ipAddress && <p>IP: {log.ipAddress}</p>}
                      {log.userAgent && <p className="truncate">User Agent: {log.userAgent}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

