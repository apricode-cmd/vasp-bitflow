/**
 * Test Virtual IBAN creation on PRODUCTION
 * This will create a real account and monitor polling
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function testProductionCreation() {
  try {
    console.log('🧪 Testing Virtual IBAN creation on BCB PRODUCTION');
    console.log('');
    
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

    console.log('📋 Environment:', config.sandbox ? 'SANDBOX' : 'PRODUCTION');
    console.log('');

    // Get a test user
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'test'
        }
      },
      include: {
        profile: true
      }
    });

    if (!testUser || !testUser.profile) {
      throw new Error('No test user found. Create a user with profile data first.');
    }

    console.log('👤 Test User:', testUser.email);
    console.log('');

    // Initialize adapter
    const bcbAdapter = new BCBGroupAdapter();
    await bcbAdapter.initialize(config);

    // Create account
    console.log('🚀 Creating Virtual IBAN account...');
    console.log('⏰ Start time:', new Date().toISOString());
    console.log('');

    const startTime = Date.now();

    const account = await bcbAdapter.createAccount({
      userId: testUser.id,
      userEmail: testUser.email,
      firstName: testUser.profile.firstName || 'Test',
      lastName: testUser.profile.lastName || 'User',
      dateOfBirth: testUser.profile.dateOfBirth?.toISOString().split('T')[0] || '1990-01-01',
      nationality: testUser.profile.nationality || 'DE',
      country: testUser.profile.country || 'DE',
      currency: 'EUR',
      address: {
        street: testUser.profile.address || 'Test Street 1',
        city: testUser.profile.city || 'Berlin',
        postalCode: testUser.profile.postalCode || '10115',
        country: testUser.profile.country || 'DE',
      },
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('');
    console.log('✅ Account created!');
    console.log('⏰ End time:', new Date().toISOString());
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log('');
    console.log('📊 Account Details:');
    console.log('   Account ID:', account.accountId);
    console.log('   IBAN:', account.iban);
    console.log('   Status:', account.status);
    console.log('   BIC:', account.bic);
    console.log('');

    if (account.iban === 'PENDING') {
      console.log('⚠️  IBAN is still PENDING after polling timeout');
      console.log('   This suggests production takes longer than 60 seconds');
    } else {
      console.log('✅ IBAN assigned successfully within timeout');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ask for confirmation
console.log('⚠️  WARNING: This will create a REAL Virtual IBAN account on PRODUCTION BCB');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
console.log('');

setTimeout(() => {
  testProductionCreation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}, 5000);

