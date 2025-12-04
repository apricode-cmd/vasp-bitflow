/**
 * Setup BCB Group Integration - Production Standard
 * 
 * Правильное хранение согласно стандарту:
 * 1. config содержит ВСЕ данные (публичные + секретные) - для админ-панели
 * 2. apiKey содержит зашифрованные секреты - для runtime использования
 */

import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/services/encryption.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Setting up BCB Group integration (Production Standard)...\n');

  // Полная конфигурация (для config)
  const fullConfig = {
    // Публичные параметры
    sandbox: true,
    baseUrl: 'https://api.uat.bcb.group',
    authUrl: 'https://auth.uat.bcb.group/oauth/token',
    clientApiUrl: 'https://client-api.uat.bcb.group',
    
    // Секретные параметры (тоже в config для отображения в UI)
    clientId: 'Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw',
    clientSecret: 'lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW',
    counterpartyId: '13608',
    segregatedAccountId: '17218'
  };

  // Только секреты (для зашифрованного apiKey)
  const secretsOnly = {
    clientId: 'Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw',
    clientSecret: 'lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW',
    counterpartyId: '13608',
    segregatedAccountId: '17218'
  };

  console.log('📋 Full Config (будет в config):');
  console.log(JSON.stringify(fullConfig, null, 2));
  
  console.log('\n🔐 Secrets Only (будет зашифровано в apiKey):');
  console.log(JSON.stringify({
    ...secretsOnly,
    clientSecret: '***' + secretsOnly.clientSecret.slice(-4)
  }, null, 2));

  // Шифруем секреты
  const encryptedApiKey = encrypt(JSON.stringify(secretsOnly));
  
  console.log('\n✅ Encrypted apiKey format:', encryptedApiKey.substring(0, 50) + '...');

  // Обновляем/создаем интеграцию
  const integration = await prisma.integration.upsert({
    where: { service: 'BCB_GROUP' },
    create: {
      service: 'BCB_GROUP',
      category: 'VIRTUAL_IBAN',
      isEnabled: true,
      status: 'active',
      config: fullConfig,
      apiKey: encryptedApiKey,
      apiEndpoint: 'https://client-api.uat.bcb.group'
    },
    update: {
      config: fullConfig,
      apiKey: encryptedApiKey,
      isEnabled: true,
      status: 'active',
      apiEndpoint: 'https://client-api.uat.bcb.group',
      updatedAt: new Date()
    }
  });

  console.log('\n✅ BCB Group integration saved successfully!');
  console.log('\n📊 Database state:');
  console.log('  Service:', integration.service);
  console.log('  Category:', integration.category);
  console.log('  Status:', integration.status);
  console.log('  isEnabled:', integration.isEnabled);
  console.log('  has apiKey:', !!integration.apiKey);
  console.log('  apiEndpoint:', integration.apiEndpoint);
  console.log('\n📋 Config fields:', Object.keys(integration.config as object).join(', '));
  
  console.log('\n✅ Готово! Теперь:');
  console.log('  1. Админ-панель получит все данные из config');
  console.log('  2. Runtime код расшифрует apiKey и получит секреты');
  console.log('  3. Все соответствует продакшен стандарту');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
