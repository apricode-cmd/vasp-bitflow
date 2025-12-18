/**
 * Delete broken PENDING account that never created on BCB
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteBrokenAccount() {
  const accountId = 'cmjb93ina0007lp7xiy1f0g6c';
  const correlationId = 'fa0606d4-c9d3-4e34-aa45-8b4e5daf575a';

  console.log('🗑️  Deleting broken PENDING account...\n');
  console.log(`   Account ID: ${accountId}`);
  console.log(`   Correlation ID: ${correlationId}`);
  console.log('');

  const account = await prisma.virtualIbanAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    console.log('❌ Account not found');
    await prisma.$disconnect();
    return;
  }

  console.log('   Status:', account.status);
  console.log('   Created:', account.createdAt.toISOString());
  console.log('   Age:', Math.floor((Date.now() - account.createdAt.getTime()) / 1000 / 60), 'minutes');
  console.log('');

  console.log('⚠️  This account never created on BCB side.');
  console.log('   Deleting from database...\n');

  await prisma.virtualIbanAccount.delete({
    where: { id: accountId }
  });

  console.log('✅ Account deleted successfully');

  await prisma.$disconnect();
}

deleteBrokenAccount();

