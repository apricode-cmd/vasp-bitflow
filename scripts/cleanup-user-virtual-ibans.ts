/**
 * Clean up all failed/pending Virtual IBAN accounts for user
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupFailedAccounts() {
  console.log('🗑️  Cleaning up failed Virtual IBAN accounts...\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'bogdan.apricode@gmail.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  const accounts = await prisma.virtualIbanAccount.findMany({
    where: {
      userId: user.id
    }
  });

  console.log(`Found ${accounts.length} Virtual IBAN accounts:\n`);

  for (const acc of accounts) {
    const metadata = acc.metadata as any;
    const correlationId = metadata?.correlationId || metadata?.bcbCorrelationId;
    const age = Math.floor((Date.now() - acc.createdAt.getTime()) / 1000 / 60);
    
    console.log(`- ${acc.id}`);
    console.log(`  Correlation ID: ${correlationId}`);
    console.log(`  Status: ${acc.status}`);
    console.log(`  IBAN: ${acc.iban}`);
    console.log(`  Age: ${age} minutes`);
    console.log(`  Created: ${acc.createdAt.toISOString()}`);
    console.log('');
  }

  if (accounts.length > 0) {
    console.log('❌ Deleting all accounts...\n');
    
    for (const acc of accounts) {
      await prisma.virtualIbanAccount.delete({
        where: { id: acc.id }
      });
      console.log(`  ✅ Deleted: ${acc.id}`);
    }
    
    console.log('');
    console.log('✅ Cleanup complete!');
    console.log('   User can now create new Virtual IBAN with correct data');
  } else {
    console.log('✅ No accounts to clean up');
  }

  await prisma.$disconnect();
}

cleanupFailedAccounts();

