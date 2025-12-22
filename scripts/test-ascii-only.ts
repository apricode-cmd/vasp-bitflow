/**
 * Test with strictly ASCII-compliant data
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function testWithASCII() {
  console.log('🧪 Testing with ASCII-only data\n');

  const integration = await prisma.integration.findFirst({
    where: { service: 'BCB_GROUP_VIRTUAL_IBAN', isEnabled: true },
  });

  if (!integration) throw new Error('Integration not found');

  let config: any = { ...integration.config };
  if (integration.apiKey) {
    const decryptedApiKeyString = decrypt(integration.apiKey);
    const decryptedApiKey = JSON.parse(decryptedApiKeyString);
    config = { ...config, ...decryptedApiKey };
  }

  const bcbAdapter = new BCBGroupAdapter();
  await bcbAdapter.initialize(config);

  // @ts-ignore
  const segregatedAccountId = bcbAdapter.segregatedAccountId;

  const correlationId = randomUUID();

  // STRICTLY ASCII-ONLY payload
  const testPayload = [{
    correlationId,
    name: 'John Smith',  // ← ASCII only
    addressLine1: 'Main Street 123',  // ← ASCII only (no Nørregade!)
    city: 'Copenhagen',  // ← ASCII only
    postcode: '1165',
    country: 'DK',
    nationality: 'DK',
    dateOfBirth: '1990-01-01',
    isIndividual: true,
  }];

  console.log('📤 Payload (ASCII-only):', JSON.stringify(testPayload, null, 2));

  const startTime = Date.now();
  
  try {
    // @ts-ignore
    await bcbAdapter.clientApiRequest(
      'POST',
      `/v2/accounts/${segregatedAccountId}/virtual`,
      testPayload
    );
    console.log(`\n✅ Request sent (${Date.now() - startTime}ms)\n`);
  } catch (error) {
    console.error('❌ Request failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Poll faster
  const delays = [500, 500, 1000, 1000, 2000, 3000];
  let found = false;

  for (let i = 0; i < delays.length; i++) {
    await new Promise(resolve => setTimeout(resolve, delays[i]));
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🔍 [${elapsed}s] Checking...`);
    
    // @ts-ignore
    const account = await bcbAdapter.findVirtualAccountByCorrelationId(correlationId, 1);

    if (account) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n🎉 SUCCESS! Account created in ${totalTime}s`);
      console.log('   IBAN:', account.virtualAccountDetails?.iban);
      console.log('   Status:', account.virtualAccountDetails?.status);
      console.log('   Correlation ID:', account.correlationId);
      found = true;
      break;
    }
  }

  if (!found) {
    console.log('\n❌ Account not found after', ((Date.now() - startTime) / 1000).toFixed(1), 'seconds');
  }

  await prisma.$disconnect();
}

testWithASCII().catch(console.error);

