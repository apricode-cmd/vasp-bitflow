/**
 * Test BCB Client API - Get All Virtual IBANs
 * 
 * Testing: GET /v1/accounts/{accountId}/virtual/all-account-data
 * Expected: List of all Virtual IBANs with their details
 */

import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';

async function testClientApiBalances() {
  console.log('🧪 Testing BCB Client API - Virtual IBANs...\n');

  const adapter = new BCBGroupAdapter();

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
    // Test: Get all Virtual IBANs
    console.log('📊 Calling: GET /v1/accounts/17218/virtual/all-account-data');
    console.log('===========================================================\n');
    
    // @ts-ignore - accessing private method
    const response = await adapter.clientApiRequest(
      'GET', 
      `/v1/accounts/17218/virtual/all-account-data`
    );
    
    console.log('✅ Success! Response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n');

    // Analyze response
    if (response.results && Array.isArray(response.results)) {
      console.log('📋 Analysis:');
      console.log('=============\n');
      console.log(`Found ${response.count} Virtual IBAN(s)\n`);
      
      response.results.forEach((account: any, index: number) => {
        console.log(`Virtual IBAN #${index + 1}:`);
        console.log(`  Correlation ID: ${account.correlationId}`);
        console.log(`  Status: ${account.virtualAccountDetails?.status}`);
        console.log(`  IBAN: ${account.virtualAccountDetails?.iban || 'PENDING'}`);
        console.log(`  BIC: ${account.virtualAccountDetails?.bic || 'N/A'}`);
        console.log(`  Owner: ${account.ownerDetails?.name || 'N/A'}`);
        
        // Check if balance is included
        if (account.virtualAccountDetails?.balance !== undefined) {
          console.log(`  ✅ Balance: €${account.virtualAccountDetails.balance}`);
        } else if (account.balance !== undefined) {
          console.log(`  ✅ Balance: €${account.balance}`);
        } else {
          console.log(`  ❌ Balance: NOT INCLUDED in response`);
        }
        console.log('');
      });

      console.log('\n🎯 Conclusion:');
      const hasBalance = response.results.some((a: any) => 
        a.virtualAccountDetails?.balance !== undefined || a.balance !== undefined
      );
      
      if (hasBalance) {
        console.log('✅ Client API includes balance in response!');
      } else {
        console.log('❌ Client API does NOT include balance in response');
        console.log('💡 Need to use Services API /v3/balances or calculate from transactions');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

testClientApiBalances()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

