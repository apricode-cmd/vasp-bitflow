/**
 * TopUpRequestsTab Component
 * 
 * Список запросов на пополнение для Virtual IBAN счёта
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Link2,
  FileText
} from 'lucide-react';

interface TopUpRequest {
  id: string;
  reference: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  user?: {
    email: string;
    profile?: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  transaction?: {
    id: string;
    amount: number;
    status: string;
    processedAt: Date | null;
  } | null;
}

interface TopUpRequestsTabProps {
  requests: TopUpRequest[];
  accountCurrency: string;
}

export function TopUpRequestsTab({ 
  requests, 
  accountCurrency 
}: TopUpRequestsTabProps): JSX.Element {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No top-up requests yet</p>
          <p className="text-sm mt-1">
            Top-up requests will appear here when users create them
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    PENDING: { 
      variant: 'secondary' as const, 
      label: 'Pending',
      icon: Clock,
      color: 'text-yellow-600',
    },
    COMPLETED: { 
      variant: 'success' as const, 
      label: 'Completed',
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    EXPIRED: { 
      variant: 'warning' as const, 
      label: 'Expired',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    CANCELLED: { 
      variant: 'destructive' as const, 
      label: 'Cancelled',
      icon: XCircle,
      color: 'text-red-600',
    },
  };

  // Group by status for stats
  const stats = {
    pending: requests.filter(r => r.status === 'PENDING').length,
    completed: requests.filter(r => r.status === 'COMPLETED').length,
    expired: requests.filter(r => r.status === 'EXPIRED').length,
    cancelled: requests.filter(r => r.status === 'CANCELLED').length,
    totalCompleted: requests
      .filter(r => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + r.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{stats.expired}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalCompleted, accountCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const config = statusConfig[req.status] || statusConfig.PENDING;
                const StatusIcon = config.icon;
                const isExpired = req.status === 'PENDING' && new Date(req.expiresAt) < new Date();
                const userName = req.user?.profile 
                  ? `${req.user.profile.firstName || ''} ${req.user.profile.lastName || ''}`.trim()
                  : req.user?.email || 'Unknown';
                
                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <code className="text-sm font-bold font-mono bg-muted px-2 py-1 rounded">
                        {req.reference}
                      </code>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(req.amount, req.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{userName}</p>
                        {req.user?.email && userName !== req.user.email && (
                          <p className="text-xs text-muted-foreground">{req.user.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        <Badge variant={isExpired ? 'warning' : config.variant}>
                          {isExpired ? 'Expired' : config.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {req.transaction ? (
                        <div className="flex items-center gap-1.5">
                          <Link2 className="h-3 w-3 text-green-600" />
                          <Badge variant="success" className="text-xs">
                            Linked
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(req.transaction.amount, req.currency)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(req.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={isExpired ? 'text-red-600' : 'text-muted-foreground'}>
                        {formatDateTime(req.expiresAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

