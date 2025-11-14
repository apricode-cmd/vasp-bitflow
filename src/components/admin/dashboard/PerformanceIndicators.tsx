/**
 * Performance Indicators Component
 * 
 * Displays key performance indicators (KPIs) for the business
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Minus, 
  CheckCircle, AlertTriangle, XCircle 
} from 'lucide-react';

interface KPI {
  value: number;
  label: string;
  unit?: string;
  status: 'good' | 'warning' | 'poor' | 'neutral';
  trend?: number;
}

interface PerformanceIndicatorsProps {
  data: {
    completionRate: KPI;
    avgProcessingTime: KPI;
    revenuePerOrder: KPI;
    kycApprovalRate: KPI;
    failedOrdersRate: KPI;
  };
}

export function PerformanceIndicators({ data }: PerformanceIndicatorsProps): JSX.Element {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'poor': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatValue = (kpi: KPI): string => {
    if (kpi.unit === '€') return `€${kpi.value.toLocaleString()}`;
    if (kpi.unit === 'hours') return `${kpi.value.toFixed(1)}h`;
    return `${kpi.value}%`;
  };

  const kpis = [
    { key: 'completionRate', data: data.completionRate },
    { key: 'avgProcessingTime', data: data.avgProcessingTime },
    { key: 'revenuePerOrder', data: data.revenuePerOrder },
    { key: 'kycApprovalRate', data: data.kycApprovalRate },
    { key: 'failedOrdersRate', data: data.failedOrdersRate }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map(({ key, data: kpi }) => {
        const statusColor = getStatusColor(kpi.status);
        const TrendIcon = kpi.trend && kpi.trend > 0 ? TrendingUp : TrendingDown;

        return (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                <div className={`text-2xl font-bold ${statusColor}`}>
                  {formatValue(kpi)}
                </div>
                {kpi.trend !== undefined && kpi.trend !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${kpi.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span>{Math.abs(kpi.trend)}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

