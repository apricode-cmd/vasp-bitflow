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

interface TimelineEntry {
  id: string;
  timestamp: Date;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  severity: string;
  before: any;
  after: any;
  context: any;
  ipAddress: string | null;
  userAgent: string | null;
  title: string;
  icon: string;
  variant: string;
}

interface AuditLogsResponse {
  success: boolean;
  data?: {
    kycSessionId: string;
    userId: string;
    timeline: TimelineEntry[];
    stats: {
      total: number;
      byType: {
        user: number;
        admin: number;
        system: number;
      };
      byAction: Record<string, number>;
      apiCalls: number;
      errors: number;
    };
  };
  error?: string;
}

interface KycHistoryTabProps {
  session: KycSessionDetail;
}

export function KycHistoryTab({ session }: KycHistoryTabProps): JSX.Element {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [session.id]);

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/kyc/${session.id}/audit-logs`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }

      const data: AuditLogsResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to load audit logs');
      }

      // Convert timestamp strings to Date objects
      const timelineWithDates = data.data.timeline.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));

      setTimeline(timelineWithDates);
      setStats(data.data.stats);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getVariantFromString = (variant: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (variant === 'success' || variant === 'default') return 'default';
    if (variant === 'destructive') return 'destructive';
    if (variant === 'outline') return 'outline';
    return 'secondary';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-destructive mb-2">Failed to load audit logs</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No activity history available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      {stats && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.byType.user}</p>
              <p className="text-xs text-muted-foreground">User Actions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.byType.admin}</p>
              <p className="text-xs text-muted-foreground">Admin Actions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{stats.byType.system}</p>
              <p className="text-xs text-muted-foreground">System Events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.apiCalls}</p>
              <p className="text-xs text-muted-foreground">API Calls</p>
            </div>
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Timeline
        </h3>

        <div className="space-y-6">
          {timeline.map((entry, index) => {
            const isLast = index === timeline.length - 1;
            const variant = getVariantFromString(entry.variant);

            return (
              <div key={entry.id} className="relative">
                {/* Timeline Line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                )}

                {/* Timeline Item */}
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {entry.action.includes('APPROVED') && <Activity className="h-4 w-4 text-green-600" />}
                      {entry.action.includes('REJECTED') && <Activity className="h-4 w-4 text-red-600" />}
                      {entry.action.includes('ERROR') && <Activity className="h-4 w-4 text-destructive" />}
                      {entry.action.includes('SUBMITTED') && <User className="h-4 w-4 text-primary" />}
                      {entry.action.includes('UPLOADED') && <User className="h-4 w-4 text-blue-600" />}
                      {entry.action.includes('WEBHOOK') && <Activity className="h-4 w-4 text-purple-600" />}
                      {entry.action.includes('API') && <Activity className="h-4 w-4 text-orange-600" />}
                      {!entry.action.includes('APPROVED') && 
                       !entry.action.includes('REJECTED') && 
                       !entry.action.includes('ERROR') &&
                       !entry.action.includes('SUBMITTED') && 
                       !entry.action.includes('UPLOADED') &&
                       !entry.action.includes('WEBHOOK') &&
                       !entry.action.includes('API') && (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={variant}>
                            {entry.title}
                          </Badge>
                          {entry.actorType && (
                            <Badge variant="outline" className="text-xs">
                              {entry.actorType}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.actorEmail ? (
                            <>by <span className="font-medium text-foreground">{entry.actorEmail}</span></>
                          ) : entry.actorType === 'SYSTEM' ? (
                            <>by <span className="font-medium text-foreground">System</span></>
                          ) : (
                            <>by <span className="font-medium text-foreground">Unknown</span></>
                          )}
                          {entry.actorRole && (
                            <span className="ml-2 text-xs">({entry.actorRole})</span>
                          )}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.timestamp)}
                      </time>
                    </div>

                    {/* Status Changes */}
                    {(entry.before || entry.after) && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {entry.before && Object.keys(entry.before).length > 0 && (
                            <div>
                              <span className="text-muted-foreground font-medium">Before:</span>
                              <pre className="mt-1 text-xs overflow-auto">
                                {JSON.stringify(entry.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.after && Object.keys(entry.after).length > 0 && (
                            <div>
                              <span className="text-muted-foreground font-medium">After:</span>
                              <pre className="mt-1 text-xs overflow-auto">
                                {JSON.stringify(entry.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Context/Metadata */}
                    {entry.context && Object.keys(entry.context).length > 0 && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground font-medium mb-2">
                            Details
                          </summary>
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(entry.context, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* Additional Info */}
                    {(entry.ipAddress || entry.userAgent) && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {entry.ipAddress && <p>IP: {entry.ipAddress}</p>}
                        {entry.userAgent && <p className="truncate max-w-md">User Agent: {entry.userAgent}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

