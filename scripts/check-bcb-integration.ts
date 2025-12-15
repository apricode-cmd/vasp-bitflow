/**
 * Check BCB Integration Status
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking BCB Integration...\n');

  const integration = await prisma.integration.findFirst({
    where: { service: 'BCB_GROUP_VIRTUAL_IBAN' },
  });

  if (!integration) {
    console.log('❌ Integration NOT FOUND!');
    console.log('   Run: npx tsx scripts/setup-bcb-prod-standard.ts');
    return;
  }

  console.log('✅ Integration found:');
  console.log('   Service:', integration.service);
  console.log('   Category:', integration.category);
  console.log('   Is Enabled:', integration.isEnabled);
  console.log('   Status:', integration.status);
  console.log('   API Endpoint:', integration.apiEndpoint);
  console.log('   Has API Key:', !!integration.apiKey);
  console.log('   Config:', JSON.stringify(integration.config, null, 2));

  // Check if it matches the query criteria
  const isActive = integration.category === 'VIRTUAL_IBAN' &&
                   integration.isEnabled === true &&
                   integration.status === 'active';

  if (isActive) {
    console.log('\n✅ Integration is ACTIVE and should work!');
  } else {
    console.log('\n❌ Integration is NOT ACTIVE:');
    if (integration.category !== 'VIRTUAL_IBAN') {
      console.log(`   ❌ Category is "${integration.category}", should be "VIRTUAL_IBAN"`);
    }
    if (!integration.isEnabled) {
      console.log('   ❌ isEnabled is false');
    }
    if (integration.status !== 'active') {
      console.log(`   ❌ Status is "${integration.status}", should be "active"`);
    }

    console.log('\n🔧 Fixing...');
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        category: 'VIRTUAL_IBAN',
        isEnabled: true,
        status: 'active',
      },
    });
    console.log('✅ Integration fixed!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

