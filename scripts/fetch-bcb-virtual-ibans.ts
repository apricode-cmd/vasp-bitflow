/**
 * Fetch all Virtual IBANs from BCB Group and save to file
 * This helps debug account creation and search issues
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function fetchBCBVirtualIBANs() {
  try {
    console.log('🔍 Fetching BCB Group integration...');
    
    // Get BCB integration from database
    const integration = await prisma.integration.findFirst({
      where: {
        service: 'BCB_GROUP_VIRTUAL_IBAN',
        isEnabled: true,
      },
    });

    if (!integration) {
      throw new Error('BCB_GROUP_VIRTUAL_IBAN integration not found or not enabled');
    }

    console.log('✅ BCB integration found:', {
      id: integration.id,
      name: integration.name,
      category: integration.category,
    });

    // Decrypt apiKey and prepare config
    let config: any = {
      ...integration.config,
    };

    // Decrypt apiKey (contains clientId, clientSecret, counterpartyId)
    if (integration.apiKey) {
      try {
        // Decrypt the encrypted apiKey
        const decryptedApiKeyString = decrypt(integration.apiKey);
        const decryptedApiKey = JSON.parse(decryptedApiKeyString);
        config = {
          ...config,
          ...decryptedApiKey,
        };
        console.log('✅ API key decrypted successfully');
        console.log('   Config keys:', Object.keys(config));
      } catch (error) {
        console.error('❌ Failed to decrypt/parse apiKey:', error);
        throw new Error('Invalid apiKey format or decryption failed');
      }
    } else {
      throw new Error('API key is missing in integration config');
    }

    // Initialize BCB adapter directly
    console.log('🔧 Initializing BCB adapter...');
    const bcbAdapter = new BCBGroupAdapter();
    await bcbAdapter.initialize(config);

    console.log('✅ BCB adapter initialized');

    // Fetch all virtual accounts
    console.log('📡 Fetching all Virtual IBANs from BCB...');
    console.log('   Endpoint: GET /v1/accounts/{accountId}/virtual/all-account-data');
    console.log('   Parameters: pageSize=1000, pageIndex=0');
    console.log('');

    const allAccounts = await bcbAdapter.getAllVirtualAccounts();

    console.log('✅ Received response from BCB');
    console.log(`   Total accounts: ${allAccounts.length}`);
    console.log('');

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bcb-virtual-ibans-${timestamp}.json`;
    const filepath = `./logs/${filename}`;

    const output = {
      timestamp: new Date().toISOString(),
      totalAccounts: allAccounts.length,
      accounts: allAccounts.map((acc: any) => ({
        correlationId: acc.correlationId,
        virtualAccountDetails: {
          id: acc.virtualAccountDetails?.id,
          status: acc.virtualAccountDetails?.status,
          iban: acc.virtualAccountDetails?.iban,
          accountNumber: acc.virtualAccountDetails?.accountNumber,
          sortCode: acc.virtualAccountDetails?.sortCode,
          bic: acc.virtualAccountDetails?.bic,
        },
        ownerDetails: {
          name: acc.ownerDetails?.name,
          iban: acc.ownerDetails?.iban,
          accountNumber: acc.ownerDetails?.accountNumber,
          sortCode: acc.ownerDetails?.sortCode,
          bic: acc.ownerDetails?.bic,
        },
      })),
      rawResponse: allAccounts, // Full raw data for analysis
    };

    writeFileSync(filepath, JSON.stringify(output, null, 2));

    console.log('💾 Data saved to:', filepath);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total accounts: ${output.totalAccounts}`);
    
    // Count by status
    const statusCounts: Record<string, number> = {};
    allAccounts.forEach((acc: any) => {
      const status = acc.virtualAccountDetails?.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('   Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });

    // Show recent correlationIds
    console.log('');
    console.log('📝 Recent accounts (last 10 correlationIds):');
    allAccounts.slice(0, 10).forEach((acc: any, index: number) => {
      console.log(`   ${index + 1}. ${acc.correlationId} - ${acc.virtualAccountDetails?.status} - ${acc.virtualAccountDetails?.iban || 'PENDING'}`);
    });

    console.log('');
    console.log('✅ Done! Check the file for full details.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchBCBVirtualIBANs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

