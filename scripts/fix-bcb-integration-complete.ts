/**
 * Fix BCB Integration - Complete Setup
 */

import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing BCB Integration...\n');

  // Production credentials (те же что в файле)
  const credentials = {
    clientId: 'E1hSBS5y3nLNKE4yL7kI69A8On0OZISl',
    clientSecret: 'oAK4wEcs6qFcm9S4Dygc6gizGYRRnW-3b08yM2uXVZSdbkWnJ89XSBmaMpe6qVgr',
    counterpartyId: '2637'
  };

  // Шифруем для apiKey
  const encryptedApiKey = encrypt(JSON.stringify(credentials));

  // Обновляем интеграцию
  const integration = await prisma.integration.update({
    where: { service: 'BCB_GROUP_VIRTUAL_IBAN' },
    data: {
      category: 'VIRTUAL_IBAN',
      isEnabled: true,
      status: 'active',
      apiEndpoint: 'https://api.bcb.group',
      apiKey: encryptedApiKey,
      config: {
        sandbox: false,
        baseUrl: 'https://api.bcb.group',
        authUrl: 'https://auth.bcb.group/oauth/token',
        clientApiUrl: 'https://client-api.bcb.group',
        audience: 'https://api.production.bcb.group',
        ...credentials
      },
    },
  });

  console.log('✅ BCB Integration fixed:');
  console.log('   Service:', integration.service);
  console.log('   Category:', integration.category);
  console.log('   Is Enabled:', integration.isEnabled);
  console.log('   Status:', integration.status);
  console.log('   API Endpoint:', integration.apiEndpoint);
  console.log('   Has API Key:', !!integration.apiKey);
  console.log('\n🎉 Done! Try refreshing the page now.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

