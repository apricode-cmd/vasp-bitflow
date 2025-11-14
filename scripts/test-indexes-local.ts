#!/usr/bin/env tsx
/**
 * Test Database Indexes Locally
 * 
 * This script tests the performance impact of adding indexes
 * by running queries before and after index creation.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryResult {
  name: string;
  before: number;
  after: number;
  improvement: string;
}

async function measureQuery(
  name: string,
  queryFn: () => Promise<any>
): Promise<number> {
  const start = Date.now();
  await queryFn();
  const duration = Date.now() - start;
  console.log(`  ${name}: ${duration}ms`);
  return duration;
}

async function main() {
  console.log('🧪 Testing Database Query Performance\n');
  console.log('📊 Running queries BEFORE indexes...\n');

  const results: QueryResult[] = [];

  // Test 1: Orders by user ID
  console.log('1️⃣  Orders by user ID');
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length > 0) {
    const before1 = await measureQuery('Find orders by userId', async () => {
      return await prisma.order.findMany({
        where: { userId: users[0].id },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    });
    results.push({ name: 'Orders by userId', before: before1, after: 0, improvement: '' });
  }

  // Test 2: Orders by status
  console.log('\n2️⃣  Orders by status');
  const before2 = await measureQuery('Find PENDING orders', async () => {
    return await prisma.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  });
  results.push({ name: 'Orders by status', before: before2, after: 0, improvement: '' });

  // Test 3: Orders with user JOIN
  console.log('\n3️⃣  Orders with user JOIN');
  const before3 = await measureQuery('Orders with user include', async () => {
    return await prisma.order.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      take: 10
    });
  });
  results.push({ name: 'Orders with JOIN', before: before3, after: 0, improvement: '' });

  // Test 4: KYC sessions by status
  console.log('\n4️⃣  KYC sessions by status');
  const before4 = await measureQuery('Find PENDING KYC', async () => {
    return await prisma.kycSession.findMany({
      where: { status: 'PENDING' },
      orderBy: { submittedAt: 'desc' },
      take: 20
    });
  });
  results.push({ name: 'KYC by status', before: before4, after: 0, improvement: '' });

  // Test 5: User wallets by currency
  console.log('\n5️⃣  User wallets by currency');
  const before5 = await measureQuery('Find BTC wallets', async () => {
    return await prisma.userWallet.findMany({
      where: { currencyCode: 'BTC' },
      include: { currency: true },
      take: 20
    });
  });
  results.push({ name: 'Wallets by currency', before: before5, after: 0, improvement: '' });

  // Test 6: Audit logs by entity
  console.log('\n6️⃣  Audit logs by entity');
  const before6 = await measureQuery('Find Order audit logs', async () => {
    return await prisma.auditLog.findMany({
      where: { entityType: 'Order' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  });
  results.push({ name: 'Audit by entity', before: before6, after: 0, improvement: '' });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BASELINE MEASUREMENTS (Before Indexes):\n');
  
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}: ${result.before}ms`);
  });

  const avgBefore = results.reduce((sum, r) => sum + r.before, 0) / results.length;
  console.log(`\n📈 Average: ${avgBefore.toFixed(2)}ms`);

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Baseline complete!');
  console.log('\n🔨 Next steps:');
  console.log('1. Review results above');
  console.log('2. Apply indexes: psql $DATABASE_URL -f prisma/migrations-manual/add-performance-indexes.sql');
  console.log('3. Run this script again to measure improvement');
  console.log('4. Compare "before" vs "after" metrics\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Error:', error);
  prisma.$disconnect();
  process.exit(1);
});

