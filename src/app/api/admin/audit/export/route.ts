/**
 * Audit Logs Export API
 * 
 * GET - Export audit logs to CSV or JSON from AdminAuditLog and UserAuditLog
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/middleware/admin-auth';
import { adminAuditLogService, type AdminAuditLogFilters } from '@/lib/services/admin-audit-log.service';
import { userAuditLogService, type UserAuditLogFilters } from '@/lib/services/user-audit-log.service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminPermission('audit', 'export');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);

    // Parse format
    const format = (searchParams.get('format') || 'json') as 'csv' | 'json';
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Use csv or json' },
        { status: 400 }
      );
    }

    // Parse log type (admin, user, or both)
    const logType = searchParams.get('type') || 'admin'; // Default to admin logs

    // Parse date filters
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    let content: string;
    let contentType: string;
    let filename: string;

    if (logType === 'admin') {
      // Export admin logs
      const filters: AdminAuditLogFilters = {
        adminId: searchParams.get('adminId') || undefined,
        action: searchParams.get('action') || undefined,
        entityType: searchParams.get('entity') || undefined,
        severity: (searchParams.get('severity') as any) || undefined,
        dateFrom: startDate,
        dateTo: endDate,
        search: searchParams.get('search') || undefined,
      };

      content = await adminAuditLogService.exportLogs(filters, format);
      filename = `admin-audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    } else if (logType === 'user') {
      // Export user logs
      const filters: UserAuditLogFilters = {
        userId: searchParams.get('userId') || undefined,
        action: searchParams.get('action') || undefined,
        entityType: searchParams.get('entity') || undefined,
        dateFrom: startDate,
        dateTo: endDate,
        search: searchParams.get('search') || undefined,
      };

      content = await userAuditLogService.exportLogs(filters, format);
      filename = `user-audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use admin or user' },
        { status: 400 }
      );
    }

    contentType = format === 'csv' ? 'text/csv' : 'application/json';

    // Log export action to AdminAuditLog
    await adminAuditLogService.createLog({
      adminId: session.adminId,
      adminEmail: session.email || 'unknown',
      adminRole: session.roleCode || 'ADMIN',
      action: 'AUDIT_LOGS_EXPORTED',
      entityType: 'AuditLog',
      entityId: 'export',
      context: {
        format,
        logType,
        filters: Object.fromEntries(searchParams.entries()),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
      severity: 'WARNING',
    });

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('❌ Export audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

