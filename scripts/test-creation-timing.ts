/**
 * Test Virtual IBAN creation with detailed logging
 * Goal: Understand EXACTLY what BCB returns and how fast accounts appear
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function testVirtualIbanCreation() {
  console.log('🧪 Testing BCB Virtual IBAN Creation Process\n');

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

  // @ts-ignore - access private property for testing
  const segregatedAccountId = bcbAdapter.segregatedAccountId;
  console.log('✅ Initialized, segregatedAccountId:', segregatedAccountId);

  // Generate unique correlationId
  const correlationId = randomUUID();
  console.log('📝 Generated correlationId:', correlationId);

  // Prepare test payload
  const testPayload = [{
    correlationId,
    name: 'Test User ' + Date.now(),
    addressLine1: 'Nørregade 12',
    city: 'Copenhagen',
    postcode: '1165',
    country: 'DK',
    nationality: 'DK',
    dateOfBirth: '1990-01-01',
    isIndividual: true,
  }];

  console.log('📤 Sending creation request...\n');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));

  // Step 1: Send creation request
  const startTime = Date.now();
  try {
    // @ts-ignore - access private method
    const response = await bcbAdapter.clientApiRequest(
      'POST',
      `/v2/accounts/${segregatedAccountId}/virtual`,
      testPayload
    );

    const requestTime = Date.now() - startTime;
    console.log(`\n✅ Creation request completed in ${requestTime}ms`);
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response || {}));

  } catch (error) {
    console.error('❌ Creation failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Step 2: Poll for account with timing
  console.log('\n⏱️  Starting polling...\n');
  
  const pollAttempts = [
    { delay: 0, label: 'Immediately' },
    { delay: 500, label: 'After 0.5s' },
    { delay: 500, label: 'After 1s' },
    { delay: 1000, label: 'After 2s' },
    { delay: 1000, label: 'After 3s' },
    { delay: 2000, label: 'After 5s' },
    { delay: 3000, label: 'After 8s' },
    { delay: 2000, label: 'After 10s' },
  ];

  for (const attempt of pollAttempts) {
    if (attempt.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, attempt.delay));
    }

    console.log(`🔍 ${attempt.label}: Checking...`);
    
    const pollStart = Date.now();
    // @ts-ignore
    const account = await bcbAdapter.findVirtualAccountByCorrelationId(correlationId, 1);
    const pollTime = Date.now() - pollStart;

    if (account) {
      const totalTime = Date.now() - startTime;
      console.log(`\n✅ ACCOUNT FOUND! Total time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      console.log('Account details:', JSON.stringify(account, null, 2));
      console.log(`\n📊 Stats:`);
      console.log(`   - Request time: ${Date.now() - startTime}ms`);
      console.log(`   - Found after: ${totalTime}ms`);
      console.log(`   - Status: ${account.virtualAccountDetails?.status}`);
      console.log(`   - IBAN: ${account.virtualAccountDetails?.iban}`);
      break;
    } else {
      console.log(`   ❌ Not found yet (query took ${pollTime}ms)`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Test complete');
}

testVirtualIbanCreation().catch(console.error);

