/**
 * Check if account status changed to CLOSED in BCB
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function checkAccountClosed() {
  const targetIban = 'LU834080000045266012';
  const targetCorrelationId = 'bdf7e09a-b341-4b43-bcc7-b65b570c9c6e';
  
  console.log('🔍 Checking if account closed in BCB...');
  console.log('   IBAN:', targetIban);
  console.log('   Waiting for BCB to process close request...\n');

  // Get BCB integration
  const integration = await prisma.integration.findFirst({
    where: {
      service: 'BCB_GROUP_VIRTUAL_IBAN',
      isEnabled: true,
    },
  });

  if (!integration) throw new Error('Integration not found');

  let config: any = { ...integration.config };
  if (integration.apiKey) {
    const decryptedApiKeyString = decrypt(integration.apiKey);
    const decryptedApiKey = JSON.parse(decryptedApiKeyString);
    config = { ...config, ...decryptedApiKey };
  }

  // Initialize adapter
  const bcbAdapter = new BCBGroupAdapter();
  await bcbAdapter.initialize(config);

  // Poll for status change (check every 5 seconds, up to 60 seconds)
  const maxAttempts = 12;
  const pollInterval = 5000;

  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`📡 Attempt ${i}/${maxAttempts}...`);
    
    const allAccounts = await bcbAdapter.getAllVirtualAccounts();
    const account = allAccounts.find((acc: any) => acc.correlationId === targetCorrelationId);

    if (!account) {
      console.log('❌ Account not found in BCB');
      break;
    }

    const status = account.virtualAccountDetails?.status;
    console.log(`   Status: ${status}`);

    if (status === 'CLOSED') {
      console.log('\n✅ Account successfully CLOSED in BCB!');
      console.log('   Time taken:', i * (pollInterval / 1000), 'seconds');
      break;
    }

    if (i < maxAttempts) {
      console.log(`   Still ACTIVE, waiting ${pollInterval / 1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } else {
      console.log('\n⏱️  Timeout: Account still ACTIVE after 60 seconds');
      console.log('   BCB may take longer to process close request');
      console.log('   Check again later');
    }
  }

  await prisma.$disconnect();
}

checkAccountClosed().catch(console.error);

