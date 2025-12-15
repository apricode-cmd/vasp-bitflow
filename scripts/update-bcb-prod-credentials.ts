/**
 * Update BCB Production Credentials in Database
 * 
 * Обновляет BCB credentials для production окружения
 * Credentials шифруются и сохраняются согласно стандарту
 */

import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating BCB Production Credentials...\n');

  // Production credentials из расшифрованного файла
  const productionCredentials = {
    clientId: 'E1hSBS5y3nLNKE4yL7kI69A8On0OZISl',
    clientSecret: 'oAK4wEcs6qFcm9S4Dygc6gizGYRRnW-3b08yM2uXVZSdbkWnJ89XSBmaMpe6qVgr',
    counterpartyId: '2637'
  };

  // Полная конфигурация (для config)
  const fullConfig = {
    // Публичные параметры
    sandbox: false,
    baseUrl: 'https://api.bcb.group',
    authUrl: 'https://auth.bcb.group/oauth/token',
    clientApiUrl: 'https://client-api.bcb.group',
    audience: 'https://api.production.bcb.group',
    
    // Секретные параметры (для отображения в UI)
    ...productionCredentials
  };

  console.log('📋 Configuration:');
  console.log({
    ...fullConfig,
    clientSecret: '***' + fullConfig.clientSecret.slice(-4)
  });

  // Шифруем секреты для apiKey
  const encryptedApiKey = encrypt(JSON.stringify(productionCredentials));
  
  console.log('\n✅ Secrets encrypted successfully');
  console.log(`   Encrypted length: ${encryptedApiKey.length} chars\n`);

  // Обновляем в базе данных
  const integration = await prisma.integration.upsert({
    where: {
      service: 'BCB_GROUP_VIRTUAL_IBAN',
    },
    update: {
      isEnabled: true,
      status: 'active',
      apiEndpoint: 'https://api.bcb.group',
      config: fullConfig,
      apiKey: encryptedApiKey,
      updatedAt: new Date(),
    },
    create: {
      service: 'BCB_GROUP_VIRTUAL_IBAN',
      category: 'VIRTUAL_IBAN',
      isEnabled: true,
      status: 'active',
      apiEndpoint: 'https://api.bcb.group',
      config: fullConfig,
      apiKey: encryptedApiKey,
    },
  });

  console.log('✅ BCB Production Integration updated!');
  console.log('   Service:', integration.service);
  console.log('   Status:', integration.status);
  console.log('   Sandbox:', (integration.config as any).sandbox);
  console.log('   API URL:', integration.apiEndpoint);
  
  console.log('\n🎉 Done! Production credentials are now in database.');
  console.log('   Next step: Redeploy on Vercel to pick up changes.');
}

main()
  .catch((error) => {
    console.error('❌ Error updating credentials:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

