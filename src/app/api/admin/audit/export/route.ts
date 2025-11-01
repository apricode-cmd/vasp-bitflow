/**
 * Audit Logs Export API
 * 
 * GET - Export audit logs to CSV or JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/middleware/admin-auth';
import { auditLogService, type AuditLogFilters } from '@/lib/services/audit-log.service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission('audit', 'export');
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);

    // Parse format
    const format = searchParams.get('format') || 'csv';
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Use csv or json' },
        { status: 400 }
      );
    }

    // Parse filters
    const filters: AuditLogFilters = {
      userId: searchParams.get('userId') || undefined,
      adminId: searchParams.get('adminId') || undefined,
      action: searchParams.get('action') || undefined,
      entity: searchParams.get('entity') || undefined,
      severity: (searchParams.get('severity') as any) || undefined,
      isReviewable: searchParams.get('isReviewable')
        ? searchParams.get('isReviewable') === 'true'
        : undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Export logs
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      content = await auditLogService.exportToCSV(filters);
      contentType = 'text/csv';
      filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      content = await auditLogService.exportToJSON(filters);
      contentType = 'application/json';
      filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Log export action
    await auditLogService.log({
      adminId: session.adminId,
      userEmail: session.email,
      userRole: session.roleCode,
      action: 'AUDIT_LOGS_EXPORTED',
      entity: 'AuditLog',
      entityId: 'export',
      metadata: {
        format,
        filters,
        exportedBy: session.adminId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
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

