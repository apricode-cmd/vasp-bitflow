/**
 * OverviewTab Component
 * 
 * Displays user activity timeline with:
 * - Recent orders
 * - KYC status changes
 * - Pay-in/Pay-out events
 * - Account events (login, registration, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTime } from '@/lib/formatters';
import { formatCurrency } from '@/lib/formatters';
import { 
  ShoppingCart, 
  Shield, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  User, 
  LogIn,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TimelineEvent {
  id: string;
  type: 'ORDER' | 'KYC' | 'PAY_IN' | 'PAY_OUT' | 'ACCOUNT' | 'LOGIN';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  link?: string;
  metadata?: Record<string, any>;
}

interface OverviewTabProps {
  userId: string;
}

const EVENT_ICONS: Record<string, any> = {
  ORDER: ShoppingCart,
  KYC: Shield,
  PAY_IN: ArrowDownCircle,
  PAY_OUT: ArrowUpCircle,
  ACCOUNT: User,
  LOGIN: LogIn,
};

const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export function OverviewTab({ userId }: OverviewTabProps): JSX.Element {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [userId]);

  const fetchTimeline = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/timeline`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data);
      } else {
        toast.error('Failed to fetch timeline');
      }
    } catch (error) {
      console.error('Fetch timeline error:', error);
      toast.error('Failed to fetch timeline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
            <p className="text-sm text-muted-foreground">
              User activity timeline will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
        <CardDescription>Complete history of user activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border"></div>

            {/* Timeline events */}
            <div className="space-y-6">
              {events.map((event, index) => {
                const Icon = EVENT_ICONS[event.type] || Clock;
                const statusColor = event.status ? STATUS_COLORS[event.status] : 'text-muted-foreground';
                
                return (
                  <div key={event.id} className="relative pl-12">
                    {/* Icon circle */}
                    <div className={`absolute left-0 flex items-center justify-center h-10 w-10 rounded-full bg-background border-2 border-border ${statusColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Event content */}
                    <div className="bg-accent/50 rounded-lg p-4 hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">
                          {event.link ? (
                            <Link href={event.link} className="hover:underline">
                              {event.title}
                            </Link>
                          ) : (
                            event.title
                          )}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDateTime(new Date(event.timestamp))}</span>
                        
                        {event.status && (
                          <Badge 
                            variant={
                              event.status === 'success' ? 'success' :
                              event.status === 'warning' ? 'warning' :
                              event.status === 'error' ? 'destructive' : 'default'
                            }
                            className="text-xs"
                          >
                            {event.status}
                          </Badge>
                        )}
                      </div>

                      {/* Metadata */}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="ml-1 font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

