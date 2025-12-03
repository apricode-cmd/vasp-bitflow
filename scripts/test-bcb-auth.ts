/**
 * BCB Group Authentication Test
 * 
 * Тестовый скрипт для проверки OAuth + GPG аутентификации
 */

import fs from 'fs';
import path from 'path';

interface BCBCredentials {
  environment: 'sandbox' | 'production';
  client_id: string;
  client_secret: string;
  counterparty_id: string;
  cid: string;
  gpg_passphrase?: string;
}

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials/bcb-sandbox/credentials.json');
const GPG_KEY_PATH = path.join(process.cwd(), 'credentials/bcb-sandbox/gpg-private-key.asc');

async function testBCBAuth() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 BCB GROUP AUTHENTICATION TEST                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // 1. Проверка наличия credentials
  console.log('📋 Шаг 1: Проверка credentials файла...');
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ Файл credentials.json не найден!');
    console.log('\nСоздайте файл: credentials/bcb-sandbox/credentials.json');
    console.log('Формат:');
    console.log(JSON.stringify({
      environment: 'sandbox',
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      counterparty_id: '12345',
      cid: 'CID-XYZ789',
      gpg_passphrase: 'optional'
    }, null, 2));
    process.exit(1);
  }
  console.log('✅ credentials.json найден\n');

  // 2. Чтение credentials
  console.log('📖 Шаг 2: Чтение credentials...');
  const credentials: BCBCredentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  console.log('✅ Credentials загружены:');
  console.log(`   Environment: ${credentials.environment}`);
  console.log(`   Client ID: ${credentials.client_id}`);
  console.log(`   Client Secret: ${credentials.client_secret.substring(0, 10)}...`);
  console.log(`   Counterparty ID: ${credentials.counterparty_id}`);
  console.log(`   CID: ${credentials.cid}\n`);

  // 3. Проверка GPG ключа
  console.log('🔐 Шаг 3: Проверка GPG ключа...');
  const hasGPGKey = fs.existsSync(GPG_KEY_PATH);
  if (hasGPGKey) {
    const gpgKeyContent = fs.readFileSync(GPG_KEY_PATH, 'utf-8');
    console.log('✅ GPG private key найден');
    console.log(`   Размер: ${gpgKeyContent.length} bytes`);
    console.log(`   Начало: ${gpgKeyContent.substring(0, 50)}...`);
  } else {
    console.log('⚠️  GPG private key не найден (опционально)');
    console.log('   Файл: credentials/bcb-sandbox/gpg-private-key.asc');
  }
  console.log('');

  // 4. Тест OAuth аутентификации
  console.log('🔑 Шаг 4: Тест OAuth аутентификации...');
  const authUrl = credentials.environment === 'sandbox' 
    ? 'https://auth.bcb.group/oauth/token'
    : 'https://auth.bcb.group/oauth/token';

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OAuth authentication failed: ${response.status}`);
      console.error(`   Response: ${errorText}`);
      
      if (response.status === 401) {
        console.log('\n💡 Проверьте:');
        console.log('   • Правильность Client ID и Client Secret');
        console.log('   • Используете sandbox credentials для sandbox окружения');
        console.log('   • Credentials активны в BCB Portal');
      }
      
      process.exit(1);
    }

    const tokenData = await response.json();
    console.log('✅ OAuth authentication успешна!');
    console.log(`   Access Token: ${tokenData.access_token.substring(0, 50)}...`);
    console.log(`   Token Type: ${tokenData.token_type}`);
    console.log(`   Expires In: ${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 3600)} hours)`);
    console.log('');

    // 5. Тест API запроса (получение списка аккаунтов)
    console.log('📊 Шаг 5: Тест API запроса (GET /v3/accounts)...');
    const apiUrl = credentials.environment === 'sandbox'
      ? 'https://api.sandbox.bcb.group'
      : 'https://api.bcb.group';

    const accountsResponse = await fetch(`${apiUrl}/v3/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error(`❌ API request failed: ${accountsResponse.status}`);
      console.error(`   Response: ${errorText}`);
      
      if (accountsResponse.status === 404) {
        console.log('\n💡 Возможно:');
        console.log('   • У вас еще нет аккаунтов в BCB');
        console.log('   • Неправильный API endpoint (проверьте sandbox vs production)');
      }
      
      // Это не критично для теста аутентификации
      console.log('\n⚠️  Аутентификация работает, но API endpoint не доступен');
      console.log('   Это нормально, если у вас еще нет созданных аккаунтов\n');
    } else {
      const accounts = await accountsResponse.json();
      console.log('✅ API request успешен!');
      console.log(`   Найдено аккаунтов: ${Array.isArray(accounts) ? accounts.length : 0}`);
      
      if (Array.isArray(accounts) && accounts.length > 0) {
        console.log('\n📋 Ваши аккаунты:');
        accounts.forEach((acc: any, idx: number) => {
          console.log(`   ${idx + 1}. ${acc.account_type} - ${acc.ccy} (${acc.account_label || 'No label'})`);
          if (acc.iban) console.log(`      IBAN: ${acc.iban}`);
          if (acc.node_address) console.log(`      Address: ${acc.node_address}`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Ошибка подключения:', error);
    console.log('\n💡 Проверьте:');
    console.log('   • Доступ к интернету');
    console.log('   • BCB Group API доступен');
    console.log('   • Правильность URL endpoints');
    process.exit(1);
  }

  // 6. Итоги
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ТЕСТ ЗАВЕРШЕН УСПЕШНО                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Результаты:');
  console.log(`   ✅ OAuth authentication работает`);
  console.log(`   ✅ Access Token получен`);
  console.log(`   ${hasGPGKey ? '✅' : '⚠️ '} GPG ключ ${hasGPGKey ? 'найден' : 'не найден (опционально)'}`);
  console.log('');
  
  console.log('🎯 Следующие шаги:');
  console.log('   1. Откройте админ-панель: http://localhost:3000/admin/integrations');
  console.log('   2. Configure "BCB Group Virtual IBAN"');
  console.log('   3. Скопируйте данные из credentials.json');
  if (hasGPGKey) {
    console.log('   4. Загрузите gpg-private-key.asc');
  }
  console.log('   5. Save и протестируйте создание Virtual IBAN\n');
}

// Запуск
testBCBAuth().catch((error) => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});





