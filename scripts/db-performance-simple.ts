/**
 * Simple Database Performance Test
 * Tests real queries and measures execution time
 * Run: npx tsx scripts/db-performance-simple.ts
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

// Track all queries
const queryLog: Array<{
  query: string;
  duration: number;
}> = [];

// @ts-ignore
prisma.$on('query', (e: any) => {
  queryLog.push({
    query: e.query,
    duration: e.duration,
  });
});

interface TestResult {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  recordsAffected?: number;
}

const results: TestResult[] = [];

/**
 * Execute test and measure performance
 */
async function measureQuery<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T | null> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    results.push({
      name,
      duration,
      success: true,
      recordsAffected: Array.isArray(result) ? result.length : 1,
    });
    
    return result;
  } catch (error: any) {
    const duration = performance.now() - start;
    results.push({
      name,
      duration,
      success: false,
      error: error.message,
    });
    return null;
  }
}

/**
 * Performance Tests
 */
async function runPerformanceTests() {
  console.log('\n🚀 DATABASE PERFORMANCE TESTS');
  console.log('='.repeat(80));

  // Test 1: User queries
  console.log('\n📝 Testing User queries...');
  await measureQuery('Count total users', async () => {
    return await prisma.user.count();
  });

  await measureQuery('Find users with KYC sessions', async () => {
    return await prisma.user.findMany({
      where: {
        kycSessions: {
          some: {},
        },
      },
      include: {
        kycSessions: {
          select: { id: true, status: true },
        },
      },
      take: 100,
    });
  });

  await measureQuery('Find user by email', async () => {
    return await prisma.user.findFirst({
      where: {
        email: {
          contains: '@',
        },
      },
    });
  });

  // Test 2: Order queries
  console.log('\n📝 Testing Order queries...');
  await measureQuery('Count total orders', async () => {
    return await prisma.order.count();
  });

  await measureQuery('Find recent orders with user', async () => {
    return await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  await measureQuery('Find orders by status (PENDING)', async () => {
    return await prisma.order.findMany({
      where: {
        status: 'PENDING',
      },
      take: 100,
    });
  });

  await measureQuery('Find orders by status (COMPLETED)', async () => {
    return await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
      },
      take: 100,
    });
  });

  // Test 3: KYC queries
  console.log('\n📝 Testing KYC queries...');
  await measureQuery('Count total KYC sessions', async () => {
    return await prisma.kycSession.count();
  });

  await measureQuery('Find KYC sessions with documents', async () => {
    return await prisma.kycSession.findMany({
      include: {
        documents: true,
      },
      take: 100,
    });
  });

  await measureQuery('Find rejected KYC sessions', async () => {
    return await prisma.kycSession.findMany({
      where: {
        status: 'REJECTED',
      },
      take: 100,
    });
  });

  await measureQuery('Find approved KYC sessions', async () => {
    return await prisma.kycSession.findMany({
      where: {
        status: 'APPROVED',
      },
      take: 100,
    });
  });

  // Test 4: Workflow queries
  console.log('\n📝 Testing Workflow queries...');
  await measureQuery('Count total workflows', async () => {
    return await prisma.workflow.count();
  });

  await measureQuery('Find active workflows', async () => {
    return await prisma.workflow.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
    });
  });

  await measureQuery('Find workflows by trigger (ORDER_CREATED)', async () => {
    return await prisma.workflow.findMany({
      where: {
        trigger: 'ORDER_CREATED',
        isActive: true,
      },
    });
  });

  await measureQuery('Find workflows with executions', async () => {
    return await prisma.workflow.findMany({
      include: {
        executions: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
      take: 10,
    });
  });

  // Test 5: Admin queries
  console.log('\n📝 Testing Admin queries...');
  await measureQuery('Count total admins', async () => {
    return await prisma.admin.count();
  });

  await measureQuery('Find admins with roles', async () => {
    return await prisma.admin.findMany({
      include: {
        role: true,
      },
      take: 50,
    });
  });

  // Test 6: Complex aggregations
  console.log('\n📝 Testing Aggregations...');
  await measureQuery('Group orders by status', async () => {
    return await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });
  });

  await measureQuery('Group KYC sessions by status', async () => {
    return await prisma.kycSession.groupBy({
      by: ['status'],
      _count: true,
    });
  });

  await measureQuery('Group users by KYC status (via session)', async () => {
    return await prisma.kycSession.groupBy({
      by: ['userId'],
      _count: true,
    });
  });

  // Test 7: Date range queries
  console.log('\n📝 Testing Date Range queries...');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await measureQuery('Find orders from last 7 days', async () => {
    return await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
  });

  await measureQuery('Find orders from last 30 days', async () => {
    return await prisma.order.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });
  });

  await measureQuery('Find KYC sessions from last 7 days', async () => {
    return await prisma.kycSession.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
  });

  // Test 8: Nested includes (N+1 problem check)
  console.log('\n📝 Testing Nested Includes (N+1 detection)...');
  await measureQuery('Find orders with user + KYC + wallets (deep)', async () => {
    return await prisma.order.findMany({
      include: {
        user: {
          include: {
            kycSessions: {
              select: { id: true, status: true },
              take: 5,
            },
            wallets: {
              select: { id: true, address: true },
              take: 5,
            },
          },
        },
      },
      take: 50,
    });
  });

  await measureQuery('Find users with all relations', async () => {
    return await prisma.user.findMany({
      include: {
        orders: {
          select: { id: true, status: true },
          take: 5,
        },
        kycSessions: {
          select: { id: true, status: true },
          take: 5,
        },
        wallets: true,
      },
      take: 20,
    });
  });

  // Test 9: Search queries
  console.log('\n📝 Testing Search queries...');
  await measureQuery('Search users by email (contains)', async () => {
    return await prisma.user.findMany({
      where: {
        email: {
          contains: 'test',
        },
      },
      take: 50,
    });
  });

  await measureQuery('Search admins by email (contains)', async () => {
    return await prisma.admin.findMany({
      where: {
        email: {
          contains: 'admin',
        },
      },
      take: 50,
    });
  });

  // Test 10: Workflow execution queries
  console.log('\n📝 Testing Workflow Execution queries...');
  await measureQuery('Count workflow executions', async () => {
    return await prisma.workflowExecution.count();
  });

  await measureQuery('Find recent workflow executions', async () => {
    return await prisma.workflowExecution.findMany({
      include: {
        workflow: {
          select: { id: true, name: true },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
    });
  });

  await measureQuery('Find failed workflow executions', async () => {
    return await prisma.workflowExecution.findMany({
      where: {
        success: false,
      },
      take: 100,
    });
  });
}

/**
 * Analyze query log
 */
function analyzeQueryLog() {
  console.log('\n⚡ QUERY PERFORMANCE ANALYSIS');
  console.log('='.repeat(80));

  if (queryLog.length === 0) {
    console.log('No queries logged');
    return;
  }

  // Sort by duration
  const sortedQueries = [...queryLog].sort((a, b) => b.duration - a.duration);

  console.log('\n🐌 SLOWEST QUERIES (Top 15):');
  console.table(
    sortedQueries.slice(0, 15).map((q, i) => ({
      rank: i + 1,
      duration_ms: q.duration.toFixed(2),
      query: q.query.substring(0, 120) + (q.query.length > 120 ? '...' : ''),
    }))
  );

  // Statistics
  const totalQueries = queryLog.length;
  const totalDuration = queryLog.reduce((sum, q) => sum + q.duration, 0);
  const avgDuration = totalDuration / totalQueries;
  const slowQueries = queryLog.filter((q) => q.duration > 100); // > 100ms
  const verySlowQueries = queryLog.filter((q) => q.duration > 500); // > 500ms

  console.log('\n📈 QUERY STATISTICS:');
  console.table({
    'Total Queries': totalQueries,
    'Total Duration (ms)': totalDuration.toFixed(2),
    'Average Duration (ms)': avgDuration.toFixed(2),
    'Slow Queries (>100ms)': slowQueries.length,
    'Very Slow (>500ms)': verySlowQueries.length,
    'Slow Query %': ((slowQueries.length / totalQueries) * 100).toFixed(2) + '%',
  });
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('\n📋 PERFORMANCE TEST REPORT');
  console.log('='.repeat(80));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const fastTests = results.filter((r) => r.success && r.duration <= 50);
  const okTests = results.filter((r) => r.success && r.duration > 50 && r.duration <= 100);
  const slowTests = results.filter((r) => r.success && r.duration > 100);

  console.log('\n✅ TEST RESULTS BY SPEED:');
  
  if (fastTests.length > 0) {
    console.log('\n⚡ FAST (<50ms):');
    console.table(
      fastTests.map((r) => ({
        name: r.name,
        duration_ms: r.duration.toFixed(2),
        records: r.recordsAffected || 'N/A',
      }))
    );
  }

  if (okTests.length > 0) {
    console.log('\n⚠️  OK (50-100ms):');
    console.table(
      okTests.map((r) => ({
        name: r.name,
        duration_ms: r.duration.toFixed(2),
        records: r.recordsAffected || 'N/A',
      }))
    );
  }

  if (slowTests.length > 0) {
    console.log('\n🐌 SLOW (>100ms):');
    console.table(
      slowTests.map((r) => ({
        name: r.name,
        duration_ms: r.duration.toFixed(2),
        records: r.recordsAffected || 'N/A',
      }))
    );
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.table(
      failed.map((r) => ({
        name: r.name,
        error: r.error?.substring(0, 100),
      }))
    );
  }

  console.log('\n📊 SUMMARY:');
  console.table({
    'Total Tests': results.length,
    'Successful': successful.length,
    'Failed': failed.length,
    'Fast (<50ms)': fastTests.length,
    'OK (50-100ms)': okTests.length,
    'Slow (>100ms)': slowTests.length,
    'Average Duration (ms)': (
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    ).toFixed(2),
  });

  console.log('\n🎯 RECOMMENDATIONS:');
  if (slowTests.length > 0) {
    console.log('⚠️  Found slow queries that need optimization:');
    slowTests.forEach((t) => {
      console.log(`   - ${t.name} (${t.duration.toFixed(2)}ms)`);
    });
    console.log('\n   💡 Consider:');
    console.log('   - Adding database indexes');
    console.log('   - Reducing data fetched');
    console.log('   - Adding pagination');
    console.log('   - Using select to limit fields');
  } else {
    console.log('✅ All queries are performing well!');
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed tests detected - check error messages above.');
  }

  // Performance grade
  const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  const grade = avgDuration < 50 ? 'A+' : avgDuration < 100 ? 'A' : avgDuration < 200 ? 'B' : avgDuration < 500 ? 'C' : 'D';
  
  console.log('\n🏆 PERFORMANCE GRADE:', grade);
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 DATABASE PERFORMANCE AUDIT');
  console.log('='.repeat(80));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    // Run performance tests
    await runPerformanceTests();

    // Analyze query log
    analyzeQueryLog();

    // Generate report
    generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('✅ Audit completed successfully!');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
  } catch (error: any) {
    console.error('\n❌ Audit failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run audit
main();

