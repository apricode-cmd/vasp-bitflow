import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

async function getReconciliationReports(params: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { status, page = 1, limit = 20 } = params;

  const where: any = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  const [reports, total] = await Promise.all([
    prisma.virtualIbanReconciliationReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.virtualIbanReconciliationReport.count({ where }),
  ]);

  // Get statistics
  const stats = await prisma.virtualIbanReconciliationReport.groupBy({
    by: ['status'],
    _count: true,
  });

  return { reports, total, pages: Math.ceil(total / limit), stats };
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'SUCCESS':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'FULL_MISMATCH':
    case 'PARTIAL_MISMATCH':
      return <AlertCircle className="h-4 w-4" />;
    case 'PENDING_REVIEW':
      return <Clock className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'SUCCESS':
      return 'default';
    case 'FULL_MISMATCH':
      return 'destructive';
    case 'PARTIAL_MISMATCH':
      return 'default';
    case 'PENDING_REVIEW':
      return 'secondary';
    default:
      return 'secondary';
  }
}

interface ReconciliationPageProps {
  searchParams: {
    status?: string;
    page?: string;
  };
}

export default async function ReconciliationPage({ searchParams }: ReconciliationPageProps) {
  const page = parseInt(searchParams.page || '1');
  const { reports, total, pages, stats } = await getReconciliationReports({
    status: searchParams.status,
    page,
  });

  const successCount = stats.find(s => s.status === 'SUCCESS')?._count || 0;
  const mismatchCount = stats.filter(s => 
    s.status === 'FULL_MISMATCH' || s.status === 'PARTIAL_MISMATCH'
  ).reduce((acc, s) => acc + s._count, 0);
  const pendingCount = stats.find(s => s.status === 'PENDING_REVIEW')?._count || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Reconciliation Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Daily balance reconciliation between BCB and local records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Now
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success</p>
              <p className="text-2xl font-bold text-green-600">{successCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Mismatches</p>
              <p className="text-2xl font-bold text-red-600">{mismatchCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Filter by Status:</label>
          <Select defaultValue={searchParams.status || 'ALL'}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="PARTIAL_MISMATCH">Partial Mismatch</SelectItem>
              <SelectItem value="FULL_MISMATCH">Full Mismatch</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reports Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Segregated Account</th>
                <th className="p-4 font-medium">BCB Balance</th>
                <th className="p-4 font-medium">Local Balance</th>
                <th className="p-4 font-medium">Difference</th>
                <th className="p-4 font-medium">Reviewed By</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No reconciliation reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const diff = Math.abs(report.difference);
                  const isBalanced = diff < 0.01;

                  return (
                    <tr key={report.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4 text-sm">
                        {new Date(report.reportDate).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusColor(report.status) as any}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(report.status)}
                            {report.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {report.segregatedAccountId}
                        </code>
                      </td>
                      <td className="p-4 font-mono text-sm">
                        €{report.bcbTotalBalance.toFixed(2)}
                      </td>
                      <td className="p-4 font-mono text-sm">
                        €{report.localTotalBalance.toFixed(2)}
                      </td>
                      <td className="p-4">
                        {isBalanced ? (
                          <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Balanced
                          </span>
                        ) : (
                          <span className={`font-mono text-sm ${diff > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {report.difference > 0 ? '+' : ''}€{report.difference.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {report.reviewedBy ? (
                          <div>
                            <p className="font-medium">{report.reviewedBy}</p>
                            {report.reviewedAt && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(report.reviewedAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not reviewed</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-4 border-t flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Page {page} of {pages} ({total} total reports)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              )}
              {page < pages && (
                <Button variant="outline" size="sm">
                  Next
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

