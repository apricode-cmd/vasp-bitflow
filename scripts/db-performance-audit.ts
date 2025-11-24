/**
 * Database Performance Audit Script
 * Analyzes query performance, indexes, and potential bottlenecks
 * Run: npx tsx scripts/db-performance-audit.ts
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

// Track all queries
const queryLog: Array<{
  query: string;
  params: string;
  duration: number;
  timestamp: number;
}> = [];

// @ts-ignore
prisma.$on('query', (e: any) => {
  queryLog.push({
    query: e.query,
    params: e.params,
    duration: e.duration,
    timestamp: e.timestamp,
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
): Promise<T> {
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
    throw error;
  }
}

/**
 * Database Analysis Queries
 */
async function analyzeDatabaseHealth() {
  console.log('\n📊 DATABASE HEALTH ANALYSIS');
  console.log('='.repeat(80));

  // 1. Check table sizes (only existing tables from Prisma schema)
  console.log('\n1️⃣  TABLE SIZES:');
  const mainTables = ['User', 'Admin', 'Order', 'KycSession', 'KycDocument', 'Wallet', 'Workflow', 'WorkflowExecution'];
  const tableSizes: any[] = [];
  
  for (const table of mainTables) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          '${table}'::text AS table_name,
          pg_size_pretty(pg_total_relation_size('"${table}"')) AS total_size,
          pg_size_pretty(pg_relation_size('"${table}"')) AS data_size
        FROM pg_class
        WHERE relname = '${table}'
        LIMIT 1;
      `;
      if (result.length > 0) {
        tableSizes.push(result[0]);
      }
    } catch (e) {
      // Table doesn't exist, skip
    }
  }
  
  console.table(tableSizes);

  // 2. Check index usage
  console.log('\n2️⃣  INDEX USAGE STATISTICS:');
  const indexUsage = await prisma.$queryRaw<any[]>`
    SELECT
      schemaname AS schema,
      tablename AS table_name,
      indexname AS index_name,
      idx_scan AS times_used,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
    LIMIT 20;
  `;
  
  console.table(indexUsage);

  // 3. Check missing indexes (sequential scans on large tables)
  console.log('\n3️⃣  TABLES WITH HIGH SEQUENTIAL SCANS (might need indexes):');
  const seqScans = await prisma.$queryRaw<any[]>`
    SELECT
      schemaname AS schema,
      tablename AS table_name,
      seq_scan AS sequential_scans,
      seq_tup_read AS rows_read_sequentially,
      idx_scan AS index_scans,
      n_live_tup AS estimated_rows,
      CASE 
        WHEN seq_scan = 0 THEN 0
        ELSE ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
      END AS index_usage_percent
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_live_tup > 100
    ORDER BY seq_scan DESC
    LIMIT 20;
  `;
  
  console.table(seqScans);

  // 4. Check bloat (unused space)
  console.log('\n4️⃣  TABLE BLOAT ANALYSIS:');
  const bloat = await prisma.$queryRaw<any[]>`
    SELECT
      schemaname AS schema,
      tablename AS table_name,
      n_live_tup AS live_rows,
      n_dead_tup AS dead_rows,
      CASE 
        WHEN n_live_tup = 0 THEN 0
        ELSE ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
      END AS dead_row_percent,
      last_vacuum,
      last_autovacuum
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup > 0
    ORDER BY n_dead_tup DESC
    LIMIT 20;
  `;
  
  console.table(bloat);
}

/**
 * Performance Tests
 */
async function runPerformanceTests() {
  console.log('\n🚀 PERFORMANCE TESTS');
  console.log('='.repeat(80));

  // Test 1: User queries
  console.log('\n📝 Testing User queries...');
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

  // Test 2: Order queries
  console.log('📝 Testing Order queries...');
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

  await measureQuery('Find orders by status', async () => {
    return await prisma.order.findMany({
      where: {
        status: 'PENDING',
      },
      take: 100,
    });
  });

  // Test 3: KYC queries
  console.log('📝 Testing KYC queries...');
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

  // Test 4: Workflow queries
  console.log('📝 Testing Workflow queries...');
  await measureQuery('Find active workflows', async () => {
    return await prisma.workflow.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
    });
  });

  await measureQuery('Find workflows by trigger', async () => {
    return await prisma.workflow.findMany({
      where: {
        trigger: 'ORDER_CREATED',
        isActive: true,
      },
    });
  });

  // Test 5: Admin queries
  console.log('📝 Testing Admin queries...');
  await measureQuery('Find admins with roles', async () => {
    return await prisma.admin.findMany({
      include: {
        role: true,
      },
      take: 50,
    });
  });

  // Test 6: Complex aggregations
  console.log('📝 Testing Aggregations...');
  await measureQuery('Count orders by status', async () => {
    return await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });
  });

  await measureQuery('Count KYC sessions by status', async () => {
    return await prisma.kycSession.groupBy({
      by: ['status'],
      _count: true,
    });
  });

  // Test 7: Full-text search simulation
  console.log('📝 Testing Search queries...');
  await measureQuery('Search users by email', async () => {
    return await prisma.user.findMany({
      where: {
        email: {
          contains: 'test',
        },
      },
      take: 50,
    });
  });

  // Test 8: Date range queries
  console.log('📝 Testing Date Range queries...');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await measureQuery('Find orders from last 7 days', async () => {
    return await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
  });

  // Test 9: Nested includes (N+1 problem check)
  console.log('📝 Testing Nested Includes...');
  await measureQuery('Find orders with user + KYC + wallets', async () => {
    return await prisma.order.findMany({
      include: {
        user: {
          include: {
            kycSessions: {
              select: { id: true, status: true },
            },
            wallets: {
              select: { id: true, address: true },
            },
          },
        },
      },
      take: 50,
    });
  });

  // Test 10: Count queries
  console.log('📝 Testing Count queries...');
  await measureQuery('Count total users', async () => {
    return await prisma.user.count();
  });

  await measureQuery('Count total orders', async () => {
    return await prisma.order.count();
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

  console.log('\n🐌 SLOWEST QUERIES (Top 10):');
  console.table(
    sortedQueries.slice(0, 10).map((q, i) => ({
      rank: i + 1,
      duration_ms: q.duration.toFixed(2),
      query: q.query.substring(0, 100) + (q.query.length > 100 ? '...' : ''),
    }))
  );

  // Statistics
  const totalQueries = queryLog.length;
  const totalDuration = queryLog.reduce((sum, q) => sum + q.duration, 0);
  const avgDuration = totalDuration / totalQueries;
  const slowQueries = queryLog.filter((q) => q.duration > 100); // > 100ms

  console.log('\n📈 QUERY STATISTICS:');
  console.table({
    'Total Queries': totalQueries,
    'Total Duration (ms)': totalDuration.toFixed(2),
    'Average Duration (ms)': avgDuration.toFixed(2),
    'Slow Queries (>100ms)': slowQueries.length,
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
  const slowTests = results.filter((r) => r.duration > 100);

  console.log('\n✅ SUCCESSFUL TESTS:');
  console.table(
    successful.map((r) => ({
      name: r.name,
      duration_ms: r.duration.toFixed(2),
      records: r.recordsAffected || 'N/A',
      status: r.duration > 100 ? '🐌 SLOW' : r.duration > 50 ? '⚠️  OK' : '⚡ FAST',
    }))
  );

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
    'Slow Tests (>100ms)': slowTests.length,
    'Average Duration (ms)': (
      results.reduce((sum, r) => sum + r.duration, 0) / results.length
    ).toFixed(2),
  });

  console.log('\n🎯 RECOMMENDATIONS:');
  if (slowTests.length > 0) {
    console.log('⚠️  Found slow tests:');
    slowTests.forEach((t) => {
      console.log(`   - ${t.name} (${t.duration.toFixed(2)}ms)`);
    });
    console.log('\n   Consider adding indexes or optimizing these queries.');
  } else {
    console.log('✅ All queries are performing well!');
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed tests detected. Check error messages above.');
  }
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
    // Step 1: Analyze database health
    await analyzeDatabaseHealth();

    // Step 2: Run performance tests
    await runPerformanceTests();

    // Step 3: Analyze query log
    analyzeQueryLog();

    // Step 4: Generate report
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

