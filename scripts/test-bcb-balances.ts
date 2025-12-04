/**
 * Test BCB API - Get Individual Virtual IBAN Balances
 * 
 * Testing: GET /v3/balances/{accountId}
 * Expected: Array of individual Virtual IBAN accounts with balances
 */

import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';

async function testBalancesEndpoint() {
  console.log('🧪 Testing BCB /v3/balances endpoint...\n');

  const adapter = new BCBGroupAdapter();

  // Initialize with our config
  await adapter.initialize({
    sandbox: true,
    clientId: 'Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw',
    clientSecret: 'lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW',
    counterpartyId: '13608',
    segregatedAccountId: '17218',
    baseUrl: 'https://api.uat.bcb.group',
    clientApiUrl: 'https://client-api.uat.bcb.group',
    authUrl: 'https://auth.uat.bcb.group/oauth/token',
  });

  console.log('✅ Adapter initialized\n');

  try {
    // Test 1: Get balance using adapter's method (currently uses v3/balances)
    console.log('📊 Test 1: Using adapter.getBalance()');
    console.log('=====================================\n');
    
    const balanceResult = await adapter.getBalance('17218');
    
    console.log('Result from getBalance():');
    console.log(JSON.stringify(balanceResult, null, 2));
    console.log('\n');

    // Test 2: Direct API call to see full response
    console.log('📊 Test 2: Direct API call to /v3/balances/17218');
    console.log('==================================================\n');
    
    // @ts-ignore - accessing private method for testing
    const fullResponse = await adapter.request('GET', '/v3/balances/17218');
    
    console.log('Full API Response:');
    console.log(JSON.stringify(fullResponse, null, 2));
    console.log('\n');

    // Test 3: Check if we get individual Virtual IBANs
    if (Array.isArray(fullResponse)) {
      console.log('📋 Analysis:');
      console.log('=============\n');
      console.log(`✅ Response is an array with ${fullResponse.length} items`);
      
      fullResponse.forEach((account: any, index: number) => {
        console.log(`\n  Account ${index + 1}:`);
        console.log(`  - IBAN: ${account.iban || 'N/A'}`);
        console.log(`  - Balance: ${account.balance} ${account.ticker}`);
        console.log(`  - Account Name: ${account.account_name || 'N/A'}`);
        console.log(`  - Account ID: ${account.account_id}`);
        console.log(`  - Account Type: ${account.account_type || 'N/A'}`);
      });

      console.log('\n🎯 Conclusion:');
      const hasMultipleIbans = fullResponse.filter((a: any) => a.iban).length > 1;
      if (hasMultipleIbans) {
        console.log('✅ API returns individual Virtual IBAN balances!');
      } else {
        console.log('⚠️  Only one account/IBAN in response');
      }
    } else {
      console.log('⚠️  Response is not an array');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testBalancesEndpoint()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

