/**
 * Test Virtual IBAN creation with real user data (including non-ASCII characters)
 * Goal: Verify that sanitization works correctly
 */

import { PrismaClient } from '@prisma/client';
import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';
import { decrypt } from '../src/lib/services/encryption.service';
import { randomUUID } from 'crypto';
import { sanitizeName, sanitizeAddress, sanitizeCity, sanitizePostcode } from '../src/lib/utils/bcb-sanitize';

const prisma = new PrismaClient();

async function testWithSanitization() {
  console.log('🧪 Testing Virtual IBAN creation with sanitization\n');

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

  // Test data WITH non-ASCII characters (like real Danish address)
  const testData = {
    name: 'Søren Müller',  // ← ø and ü
    address: 'Nørregade 12',  // ← ø
    city: 'København',  // ← ø
    postcode: '1165',
  };

  console.log('📝 Original data (with non-ASCII):');
  console.log('   Name:', testData.name);
  console.log('   Address:', testData.address);
  console.log('   City:', testData.city);
  console.log();

  // Show sanitization results
  console.log('🧹 After sanitization:');
  console.log('   Name:', sanitizeName(testData.name));
  console.log('   Address:', sanitizeAddress(testData.address));
  console.log('   City:', sanitizeCity(testData.city));
  console.log('   Postcode:', sanitizePostcode(testData.postcode));
  console.log();

  const payload = [{
    correlationId,
    name: sanitizeName(testData.name),
    addressLine1: sanitizeAddress(testData.address),
    city: sanitizeCity(testData.city),
    postcode: sanitizePostcode(testData.postcode),
    country: 'DK',
    nationality: 'DK',
    dateOfBirth: '1985-05-15',
    isIndividual: true,
  }];

  console.log('📤 Sending creation request...');
  const startTime = Date.now();
  
  try {
    // @ts-ignore
    await bcbAdapter.clientApiRequest(
      'POST',
      `/v2/accounts/${segregatedAccountId}/virtual`,
      payload
    );
    console.log(`✅ Request sent (${Date.now() - startTime}ms)\n`);
  } catch (error) {
    console.error('❌ Request failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Poll with 1-second intervals (matching production code)
  for (let i = 1; i <= 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🔍 [${elapsed}s] Attempt ${i}/10...`);
    
    // @ts-ignore
    const account = await bcbAdapter.findVirtualAccountByCorrelationId(correlationId, 1);

    if (account) {
      const details = account.virtualAccountDetails;
      
      if (details?.iban && details.status === 'ACTIVE') {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🎉 SUCCESS! Account created in ${totalTime}s`);
        console.log('   IBAN:', details.iban);
        console.log('   Status:', details.status);
        console.log('   Correlation ID:', account.correlationId);
        console.log('   Owner:', account.ownerDetails?.name);
        console.log('\n✅ Sanitization worked! Non-ASCII characters were properly handled.');
        break;
      } else {
        console.log(`   → ${details?.status || 'PENDING'} (no IBAN yet)`);
      }
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Test complete');
}

testWithSanitization().catch(console.error);

