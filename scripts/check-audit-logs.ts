/**
 * Check Audit Logs in Database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAuditLogs() {
  console.log('🔍 Checking Audit Logs...\n');

  try {
    // Total count
    const totalCount = await prisma.auditLog.count();
    console.log(`📊 Total Audit Logs: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n❌ No audit logs found in database!');
      console.log('\n💡 Possible reasons:');
      console.log('   1. Audit logging was not implemented yet');
      console.log('   2. No user activities have been logged');
      console.log('   3. Audit logs were cleared/deleted');
      return;
    }

    // Count by action
    const byAction = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: {
        _count: {
          action: 'desc'
        }
      }
    });

    console.log('\n📋 Logs by Action:');
    byAction.forEach(item => {
      console.log(`   ${item.action}: ${item._count}`);
    });

    // Count by userId (client actions)
    const clientLogs = await prisma.auditLog.count({
      where: {
        userId: { not: null }
      }
    });

    console.log(`\n👤 Client User Logs: ${clientLogs}`);

    // Count by adminId (admin actions)
    const adminLogs = await prisma.auditLog.count({
      where: {
        adminId: { not: null }
      }
    });

    console.log(`🔐 Admin User Logs: ${adminLogs}`);

    // Recent logs
    const recent = await prisma.auditLog.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        action: true,
        entity: true,
        userId: true,
        adminId: true,
        createdAt: true,
      }
    });

    console.log('\n📅 Recent 5 Logs:');
    recent.forEach(log => {
      const actor = log.userId ? `User ${log.userId.slice(0, 8)}` : 
                    log.adminId ? `Admin ${log.adminId.slice(0, 8)}` : 'Unknown';
      console.log(`   ${log.action} - ${log.entity} by ${actor} at ${log.createdAt.toISOString()}`);
    });

  } catch (error) {
    console.error('❌ Error checking audit logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditLogs();

