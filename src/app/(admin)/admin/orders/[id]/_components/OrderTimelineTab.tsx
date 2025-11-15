/**
 * Order Timeline Tab
 * Complete history of order status changes and events
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateTime } from '@/lib/formatters';
import { 
  History,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  XCircle,
  User,
  RefreshCw
} from 'lucide-react';

interface OrderTimelineTabProps {
  order: {
    paymentReference: string;
    createdAt: string;
    statusHistory?: Array<{
      id: string;
      oldStatus: string;
      newStatus: string;
      changedBy: string;
      note?: string | null;
      createdAt: string;
    }>;
  };
}

const STATUS_ICONS = {
  PENDING: { icon: Clock, color: 'bg-yellow-500' },
  PAYMENT_PENDING: { icon: Clock, color: 'bg-blue-500' },
  PAYMENT_RECEIVED: { icon: CheckCircle, color: 'bg-green-500' },
  PROCESSING: { icon: TrendingUp, color: 'bg-blue-600' },
  COMPLETED: { icon: CheckCircle, color: 'bg-emerald-500' },
  CANCELLED: { icon: XCircle, color: 'bg-red-500' },
  FAILED: { icon: AlertCircle, color: 'bg-red-600' },
  EXPIRED: { icon: AlertCircle, color: 'bg-gray-500' },
};

export function OrderTimelineTab({ order }: OrderTimelineTabProps): JSX.Element {
  const sortedHistory = [...(order.statusHistory || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!sortedHistory || sortedHistory.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No History Available</h3>
          <p className="text-sm text-muted-foreground">
            No status changes have been recorded for this order yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete history of all status changes and events for order {order.paymentReference}
          </p>
        </CardContent>
      </Card>

      {/* Timeline Events */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Order Created Event */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div className="h-full w-px bg-border mt-2" />
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">Order Created</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">CREATED</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Order {order.paymentReference} was created
                </p>
              </div>
            </div>

            {/* Status Changes */}
            {sortedHistory.map((event, index) => {
              const isLast = index === sortedHistory.length - 1;
              const StatusConfig = STATUS_ICONS[event.newStatus as keyof typeof STATUS_ICONS] || STATUS_ICONS.PENDING;
              const StatusIcon = StatusConfig.icon;

              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full ${StatusConfig.color} flex items-center justify-center flex-shrink-0`}>
                      <StatusIcon className="h-5 w-5 text-white" />
                    </div>
                    {!isLast && <div className="h-full w-px bg-border mt-2" />}
                  </div>
                  <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">
                          Status Changed: {event.oldStatus} → {event.newStatus}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{event.newStatus}</Badge>
                    </div>

                    {event.note && (
                      <div className="p-3 bg-muted rounded-lg mb-3">
                        <p className="text-sm">{event.note}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Changed by: {event.changedBy}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Current State */}
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Current status - awaiting further actions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{sortedHistory.length + 1}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status Changes</p>
              <p className="text-2xl font-bold">{sortedHistory.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Update</p>
              <p className="text-sm font-medium">
                {sortedHistory.length > 0 
                  ? new Date(sortedHistory[0].createdAt).toLocaleDateString()
                  : new Date(order.createdAt).toLocaleDateString()
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

