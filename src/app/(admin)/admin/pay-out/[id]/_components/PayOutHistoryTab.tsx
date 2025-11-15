/**
 * PayOut History Tab Component
 * Displays audit log and history for a PayOut
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/formatters';
import { Clock, User, Edit, CheckCircle, XCircle, Send } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: any;
  metadata: any;
  adminId: string | null;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface PayOutHistoryTabProps {
  payOutId: string;
}

export function PayOutHistoryTab({ payOutId }: PayOutHistoryTabProps): JSX.Element {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [payOutId]);

  const fetchHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/audit-log?entityType=PAYOUT&entityId=${payOutId}`);
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes('UPDATE')) return <Edit className="h-4 w-4 text-blue-600" />;
    if (action.includes('SENT')) return <Send className="h-4 w-4 text-purple-600" />;
    if (action.includes('CONFIRMED')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes('FAILED')) return <XCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'PAYOUT_CREATED': 'PayOut Created',
      'PAYOUT_UPDATED': 'PayOut Updated',
      'PAYOUT_SENT': 'Marked as Sent',
      'PAYOUT_CONFIRMED': 'Marked as Confirmed',
      'PAYOUT_FAILED': 'Marked as Failed',
      'PAYOUT_CANCELLED': 'Cancelled',
    };
    return labels[action] || action.replace(/_/g, ' ');
  };

  const formatChanges = (changes: any) => {
    if (!changes) return null;
    
    return Object.entries(changes).map(([key, value]) => {
      if (key === 'status') {
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline">{value as string}</Badge>
          </div>
        );
      }
      
      return (
        <div key={key} className="text-sm text-muted-foreground">
          <span className="font-medium">{key}:</span> {JSON.stringify(value)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No activity history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div 
                key={entry.id} 
                className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getActionIcon(entry.action)}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {getActionLabel(entry.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.userEmail || entry.adminId || 'System'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>

                  {/* Changes */}
                  {entry.changes && (
                    <div className="space-y-1">
                      {formatChanges(entry.changes)}
                    </div>
                  )}

                  {/* Metadata */}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {Object.entries(entry.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IP Address */}
                  {entry.ipAddress && (
                    <p className="text-xs text-muted-foreground">
                      IP: {entry.ipAddress}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

