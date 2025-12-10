/**
 * Sync Pending Virtual IBAN from BCB
 * 
 * Usage:
 * npx tsx scripts/sync-pending-iban.ts <accountId>
 */

import { PrismaClient } from '@prisma/client';
import { integrationFactory } from '../src/lib/integrations/IntegrationFactory';

const prisma = new PrismaClient();

async function syncPendingIban(accountId: string) {
  console.log('\n🔄 Syncing Virtual IBAN from BCB Group\n');
  console.log('Account ID:', accountId);
  console.log();

  try {
    // Get account from DB
    const account = await prisma.virtualIbanAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      console.error('❌ Account not found');
      process.exit(1);
    }

    console.log('Current state:');
    console.log('  IBAN:', account.iban);
    console.log('  Status:', account.status);
    console.log('  Provider Account ID:', account.providerAccountId);
    console.log();

    // Get metadata
    const metadata = account.metadata as Record<string, any> || {};
    const correlationId = metadata.correlationId || metadata.bcbCorrelationId;
    const segregatedAccountId = metadata.segregatedAccountId;

    if (!correlationId) {
      console.error('❌ No correlation ID found in metadata');
      process.exit(1);
    }

    console.log('📡 Fetching from BCB...');
    console.log('  Correlation ID:', correlationId);
    console.log('  Segregated Account ID:', segregatedAccountId);
    console.log();

    // Get BCB provider
    const provider = await integrationFactory.getVirtualIbanProvider('BCB_GROUP_VIRTUAL_IBAN');

    // Fetch account details directly from BCB
    const bcbAdapter = provider as any;
    
    // Call BCB Client API
    const virtualAccounts = await bcbAdapter.request(
      'GET',
      `/v1/accounts/${segregatedAccountId}/virtual/all-account-data?pageSize=100`
    );

    // Find our account by correlation ID
    const virtualAccountData = virtualAccounts.content?.find(
      (acc: any) => acc.correlationId === correlationId
    );

    if (!virtualAccountData) {
      console.error('❌ Account not found in BCB');
      console.log('Available accounts:', virtualAccounts.content?.length || 0);
      process.exit(1);
    }

    console.log('✅ Found in BCB:');
    console.log('  Status:', virtualAccountData.virtualAccountStatus);
    console.log('  IBAN:', virtualAccountData.iban || 'PENDING');
    console.log('  BIC:', virtualAccountData.bic || 'N/A');
    console.log();

    // Update database if IBAN is ready
    if (virtualAccountData.iban && virtualAccountData.iban !== 'PENDING') {
      console.log('💾 Updating database...');
      
      const updated = await prisma.virtualIbanAccount.update({
        where: { id: accountId },
        data: {
          iban: virtualAccountData.iban,
          bic: virtualAccountData.bic || null,
          status: virtualAccountData.virtualAccountStatus === 'active' ? 'ACTIVE' : 'PENDING',
          bankName: virtualAccountData.bankName || account.bankName,
          updatedAt: new Date(),
        },
      });

      console.log('✅ Updated!');
      console.log('  New IBAN:', updated.iban);
      console.log('  New Status:', updated.status);
      console.log();
    } else {
      console.log('⏳ IBAN still pending in BCB. Try again later.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get account ID from command line
const accountId = process.argv[2];

if (!accountId) {
  console.error('Usage: npx tsx scripts/sync-pending-iban.ts <accountId>');
  process.exit(1);
}

syncPendingIban(accountId)
  .then(() => {
    console.log('✅ Sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });




