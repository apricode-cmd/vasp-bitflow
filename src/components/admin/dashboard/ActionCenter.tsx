/**
 * Action Center Component
 * 
 * Displays actionable items that require immediate admin attention
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { 
  AlertCircle, Shield, CreditCard, Clock, 
  ArrowRight, CheckCircle, Bell
} from 'lucide-react';

interface ActionItem {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  count?: number;
  action: {
    label: string;
    href: string;
  };
  priority: number;
  icon?: string;
}

const iconMap: Record<string, any> = {
  AlertCircle,
  Shield,
  CreditCard,
  Clock,
  CheckCircle,
  Bell
};

export function ActionCenter(): JSX.Element {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActionItems();
    
    // Refresh every 2 minutes (less frequent than stats)
    const interval = setInterval(fetchActionItems, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchActionItems = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/action-center');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch action items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-l-4 border-l-green-500 dark:border-l-green-600 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">All Clear! 🎉</h3>
              <p className="text-xs text-green-700 dark:text-green-300">
                No urgent items require your attention.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'urgent':
        return {
          badgeVariant: 'destructive' as const,
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400'
        };
      case 'warning':
        return {
          badgeVariant: 'warning' as const,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        };
      default:
        return {
          badgeVariant: 'secondary' as const,
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const urgentCount = items.filter(i => i.type === 'urgent').length;
  const warningCount = items.filter(i => i.type === 'warning').length;

  return (
    <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-600 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-orange-900 dark:text-orange-100">
              ⚠️ Requires Attention
            </h3>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {urgentCount > 0 && `${urgentCount} urgent`}
              {urgentCount > 0 && warningCount > 0 && ' • '}
              {warningCount > 0 && `${warningCount} warning`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {items.map((item) => {
            const config = getTypeConfig(item.type);
            const Icon = item.icon ? iconMap[item.icon] : AlertCircle;

            return (
              <Link key={item.id} href={item.action.href}>
                <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${config.iconColor} bg-white dark:bg-gray-900`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {item.count && (
                      <span className={`text-2xl font-bold ${config.iconColor} ml-auto`}>
                        {item.count}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${config.iconColor}`}>
                      {item.action.label}
                    </span>
                    <ArrowRight className={`h-3 w-3 ${config.iconColor} group-hover:translate-x-0.5 transition-transform`} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

