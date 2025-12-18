/**
 * Test Virtual IBAN creation with DETAILED logging
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

// Monkey-patch fetch to log all requests
const originalFetch = global.fetch;
global.fetch = async (url: any, options: any) => {
  console.log('\n🌐 HTTP REQUEST:');
  console.log('   URL:', url);
  console.log('   Method:', options?.method || 'GET');
  if (options?.headers) {
    console.log('   Headers:', JSON.stringify(options.headers, null, 2));
  }
  if (options?.body) {
    console.log('   Body:', options.body);
  }
  
  const response = await originalFetch(url, options);
  
  console.log('   Status:', response.status, response.statusText);
  
  return response;
};

async function testWithLogging() {
  try {
    console.log('🧪 Testing Virtual IBAN creation with DETAILED logging\n');
    
    // Get integration
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

    console.log('📋 Environment:', config.sandbox ? 'SANDBOX' : 'PRODUCTION');
    console.log('📋 Counterparty ID:', config.counterpartyId);
    console.log('📋 Client API URL:', config.clientApiUrl || 'default');
    console.log('');

    // Initialize adapter
    const adapter = new BCBGroupAdapter();
    console.log('🔧 Initializing BCB adapter...\n');
    await adapter.initialize(config);

    console.log('\n✅ Adapter initialized');
    console.log('');
    console.log('========================================');
    console.log('  CREATING VIRTUAL IBAN ACCOUNT');
    console.log('========================================\n');

    const testRequest = {
      userId: 'test-user-' + Date.now(),
      userEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      nationality: 'DE',
      country: 'DE',
      currency: 'EUR',
      address: {
        street: 'Test Street 1',
        city: 'Berlin',
        postalCode: '10115',
        country: 'DE',
      },
    };

    console.log('📝 Request data:');
    console.log(JSON.stringify(testRequest, null, 2));
    console.log('');

    const startTime = Date.now();
    const account = await adapter.createAccount(testRequest);
    const duration = Date.now() - startTime;

    console.log('');
    console.log('========================================');
    console.log('  RESULT');
    console.log('========================================\n');
    console.log('⏱️  Duration:', (duration / 1000).toFixed(2), 'seconds');
    console.log('');
    console.log('Account:', JSON.stringify(account, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testWithLogging();

