/**
 * Delete old broken PENDING accounts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteOldPendingAccounts() {
  console.log('🗑️  Finding old PENDING accounts...\n');

  const pendingAccounts = await prisma.virtualIbanAccount.findMany({
    where: {
      status: 'PENDING',
      createdAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000) // older than 5 minutes
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${pendingAccounts.length} old PENDING accounts\n`);

  for (const acc of pendingAccounts) {
    const metadata = acc.metadata as any;
    const correlationId = metadata?.correlationId || metadata?.bcbCorrelationId;
    const age = Math.floor((Date.now() - acc.createdAt.getTime()) / 1000 / 60);
    
    console.log(`❌ Account: ${acc.id}`);
    console.log(`   Correlation ID: ${correlationId}`);
    console.log(`   Created: ${acc.createdAt.toISOString()} (${age} minutes ago)`);
    console.log(`   Status: ${acc.status}`);
    console.log(`   IBAN: ${acc.iban}`);
    console.log('');
  }

  if (pendingAccounts.length > 0) {
    console.log('\n⚠️  These accounts failed to create on BCB side.');
    console.log('   They should be deleted to avoid confusion.');
    console.log('');
    console.log('   Run this to delete:');
    console.log(`   DELETE FROM "VirtualIbanAccount" WHERE status = 'PENDING' AND "createdAt" < NOW() - INTERVAL '5 minutes';`);
  } else {
    console.log('✅ No old PENDING accounts found');
  }

  await prisma.$disconnect();
}

deleteOldPendingAccounts();

