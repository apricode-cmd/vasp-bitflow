import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ShieldAlert,
  Filter,
  Download,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

async function getAuditLogs(params: {
  severity?: string;
  type?: string;
  accountId?: string;
  page?: number;
  limit?: number;
}) {
  const { severity, type, accountId, page = 1, limit = 50 } = params;

  const where: any = {};

  if (severity && severity !== 'ALL') {
    where.severity = severity;
  }

  if (type && type !== 'ALL') {
    where.type = type;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  const [logs, total] = await Promise.all([
    prisma.virtualIbanAuditLog.findMany({
      where,
      include: {
        account: {
          select: {
            iban: true,
            userId: true,
          },
        },
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        admin: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.virtualIbanAuditLog.count({ where }),
  ]);

  return { logs, total, pages: Math.ceil(total / limit) };
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return <ShieldAlert className="h-4 w-4" />;
    case 'ERROR':
      return <AlertCircle className="h-4 w-4" />;
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4" />;
    case 'INFO':
    default:
      return <Info className="h-4 w-4" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'destructive';
    case 'ERROR':
      return 'destructive';
    case 'WARNING':
      return 'default';
    case 'INFO':
    default:
      return 'secondary';
  }
}

interface AuditLogsPageProps {
  searchParams: {
    severity?: string;
    type?: string;
    accountId?: string;
    page?: string;
  };
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const page = parseInt(searchParams.page || '1');
  const { logs, total, pages } = await getAuditLogs({
    severity: searchParams.severity,
    type: searchParams.type,
    accountId: searchParams.accountId,
    page,
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete audit trail of all Virtual IBAN operations
          </p>
        </div>
        <div className="flex gap-2">
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
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <Info className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        {(['CRITICAL', 'ERROR', 'WARNING'] as const).map((severity) => {
          const count = logs.filter(log => log.severity === severity).length;
          return (
            <Card key={severity} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{severity}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                {getSeverityIcon(severity)}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Severity</label>
            <Select defaultValue={searchParams.severity || 'ALL'}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select defaultValue={searchParams.type || 'ALL'}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="ACCOUNT_CREATED">Account Created</SelectItem>
                <SelectItem value="BALANCE_CREDITED">Balance Credited</SelectItem>
                <SelectItem value="BALANCE_DEBITED">Balance Debited</SelectItem>
                <SelectItem value="BALANCE_MISMATCH">Balance Mismatch</SelectItem>
                <SelectItem value="TRANSACTION_PROCESSED">Transaction Processed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Search IBAN</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="DK..."
                defaultValue={searchParams.accountId}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium">Severity</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Account</th>
                <th className="p-4 font-medium">Initiator</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4 text-sm">
                      {new Date(log.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-4">
                      <Badge variant={getSeverityColor(log.severity) as any}>
                        <span className="flex items-center gap-1">
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </span>
                      </Badge>
                    </td>
                    <td className="p-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.type}
                      </code>
                    </td>
                    <td className="p-4 text-sm">{log.action}</td>
                    <td className="p-4 text-sm max-w-md truncate">
                      {log.description}
                    </td>
                    <td className="p-4">
                      {log.account ? (
                        <code className="text-xs">{log.account.iban}</code>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {log.user && (
                        <div>
                          <p className="font-medium">
                            {log.user.profile?.firstName} {log.user.profile?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </div>
                      )}
                      {log.admin && (
                        <div>
                          <p className="font-medium">
                            Admin: {log.admin.firstName} {log.admin.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{log.admin.email}</p>
                        </div>
                      )}
                      {!log.user && !log.admin && (
                        <span className="text-xs text-muted-foreground">System</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-4 border-t flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Page {page} of {pages} ({total} total logs)
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

