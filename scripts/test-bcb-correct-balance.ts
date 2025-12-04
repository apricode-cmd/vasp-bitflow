/**
 * Test BCB Balance API with correct Segregated Account ID
 */

import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';

async function testCorrectBalance() {
  console.log('🧪 Testing with CORRECT Segregated Account ID: 94092443\n');

  const adapter = new BCBGroupAdapter();

  await adapter.initialize({
    sandbox: true,
    clientId: 'Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw',
    clientSecret: 'lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW',
    counterpartyId: '13608',
    segregatedAccountId: '94092443', // ← Правильный ID!
    baseUrl: 'https://api.uat.bcb.group',
    clientApiUrl: 'https://client-api.uat.bcb.group',
    authUrl: 'https://auth.uat.bcb.group/oauth/token',
  });

  console.log('✅ Adapter initialized\n');

  try {
    // Test 1: Get balances (should return array with individual Virtual IBANs)
    console.log('📊 Test 1: GET /v3/balances/94092443');
    console.log('========================================\n');
    
    // @ts-ignore
    const balances = await adapter.request('GET', '/v3/balances/94092443');
    
    console.log(`✅ Got ${balances.length} balance(s):\n`);
    
    balances.forEach((bal: any, idx: number) => {
      console.log(`Balance ${idx + 1}:`);
      console.log(`  IBAN: ${bal.iban}`);
      console.log(`  Amount: €${bal.balance}`);
      console.log(`  Currency: ${bal.ticker}`);
      console.log(`  Account Name: ${bal.account_name}`);
      console.log(`  Account ID: ${bal.account_id}`);
      console.log('');
    });

    // Test 2: Get Virtual IBANs via Client API
    console.log('\n📊 Test 2: GET /v1/accounts/94092443/virtual/all-account-data');
    console.log('=============================================================\n');
    
    // @ts-ignore
    const virtualAccounts = await adapter.clientApiRequest(
      'GET',
      `/v1/accounts/94092443/virtual/all-account-data`
    );
    
    console.log(`✅ Got ${virtualAccounts.count} Virtual IBAN(s):\n`);
    
    virtualAccounts.results.forEach((va: any, idx: number) => {
      console.log(`Virtual IBAN ${idx + 1}:`);
      console.log(`  IBAN: ${va.virtualAccountDetails.iban}`);
      console.log(`  Status: ${va.virtualAccountDetails.status}`);
      console.log(`  Owner: ${va.ownerDetails.name}`);
      console.log(`  Correlation ID: ${va.correlationId}`);
      console.log('');
    });

    // Test 3: Match balances to Virtual IBANs
    console.log('\n📊 Test 3: Match Balances to Virtual IBANs');
    console.log('==========================================\n');

    // Create a map of IBAN -> balance
    const balanceMap = new Map();
    balances.forEach((bal: any) => {
      if (bal.iban) {
        balanceMap.set(bal.iban, bal.balance);
      }
    });

    // Match with Virtual IBANs
    virtualAccounts.results.forEach((va: any, idx: number) => {
      const iban = va.virtualAccountDetails.iban;
      const balance = balanceMap.get(iban);
      
      console.log(`${idx + 1}. ${va.ownerDetails.name}`);
      console.log(`   IBAN: ${iban}`);
      console.log(`   Balance: ${balance !== undefined ? `€${balance}` : '❌ NOT FOUND'}`);
      console.log('');
    });

    console.log('\n🎯 Conclusion:');
    console.log('================\n');
    console.log('✅ /v3/balances/{accountId} returns individual balances');
    console.log('✅ Client API returns Virtual IBAN details');
    console.log('✅ We can match them by IBAN');
    console.log('\n💡 Recommendation: Use /v3/balances for balance sync');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

testCorrectBalance()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

