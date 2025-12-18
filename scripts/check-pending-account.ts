/**
 * Check if PENDING account eventually appeared in BCB
 * Fetch fresh data and search again
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function checkPendingAccount() {
  try {
    console.log('🔍 Checking if PENDING account appeared in BCB...');
    console.log('');
    
    // Get pending account from DB
    const pendingAccount = await prisma.virtualIbanAccount.findFirst({
      where: {
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!pendingAccount) {
      console.log('✅ No pending accounts found in database');
      return;
    }

    const metadata = pendingAccount.metadata as any;
    const correlationId = metadata?.correlationId || metadata?.bcbCorrelationId;

    console.log('📋 Pending Account from DB:');
    console.log('   ID:', pendingAccount.id);
    console.log('   Correlation ID:', correlationId);
    console.log('   Created:', pendingAccount.createdAt.toISOString());
    console.log('   Age:', Math.floor((Date.now() - pendingAccount.createdAt.getTime()) / 1000 / 60), 'minutes');
    console.log('');

    if (!correlationId) {
      console.log('❌ No correlationId found in metadata');
      return;
    }

    // Get BCB integration
    const integration = await prisma.integration.findFirst({
      where: {
        service: 'BCB_GROUP_VIRTUAL_IBAN',
        isEnabled: true,
      },
    });

    if (!integration) {
      throw new Error('BCB_GROUP_VIRTUAL_IBAN integration not found');
    }

    // Decrypt and prepare config
    let config: any = { ...integration.config };
    if (integration.apiKey) {
      const decryptedApiKeyString = decrypt(integration.apiKey);
      const decryptedApiKey = JSON.parse(decryptedApiKeyString);
      config = { ...config, ...decryptedApiKey };
    }

    // Initialize adapter
    console.log('🔧 Initializing BCB adapter...');
    const bcbAdapter = new BCBGroupAdapter();
    await bcbAdapter.initialize(config);

    // Fetch fresh data from BCB
    console.log('📡 Fetching fresh data from BCB...');
    const allAccounts = await bcbAdapter.getAllVirtualAccounts();
    console.log(`   Found ${allAccounts.length} accounts in BCB`);
    console.log('');

    // Search for our correlationId
    const bcbAccount = allAccounts.find((acc: any) => acc.correlationId === correlationId);

    if (bcbAccount) {
      console.log('✅ FOUND in BCB!');
      console.log('');
      console.log('BCB Account Details:');
      console.log('   Correlation ID:', bcbAccount.correlationId);
      console.log('   Status:', bcbAccount.virtualAccountDetails?.status);
      console.log('   IBAN:', bcbAccount.virtualAccountDetails?.iban || 'PENDING');
      console.log('   BIC:', bcbAccount.virtualAccountDetails?.bic || 'N/A');
      console.log('');
      console.log('💡 The account WAS created, but took longer than our polling timeout.');
      console.log('   Recommendation: Increase polling timeout or implement async status check.');
    } else {
      console.log('❌ NOT FOUND in BCB');
      console.log('');
      console.log('💡 Possible reasons:');
      console.log('   1. Account creation failed on BCB side');
      console.log('   2. Wrong environment (sandbox vs production)');
      console.log('   3. CorrelationId mismatch');
      console.log('');
      console.log('   Search all accounts? (showing first 20)');
      allAccounts.slice(0, 20).forEach((acc: any, i: number) => {
        console.log(`   ${i + 1}. ${acc.correlationId} - ${acc.virtualAccountDetails?.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

