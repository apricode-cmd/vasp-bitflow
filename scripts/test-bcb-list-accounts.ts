/**
 * Test BCB API - List All Accounts
 * 
 * Let's see what accounts we have access to
 */

import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';

async function listAllAccounts() {
  console.log('🧪 Testing BCB API - List Accounts...\n');

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
    // Get list of accounts
    console.log('📊 Step 1: Get all accounts via /v3/accounts');
    console.log('=============================================\n');
    
    // @ts-ignore
    const accounts = await adapter.request('GET', '/v3/accounts?counterparty_id=13608&limit=50');
    
    console.log(`Found ${accounts.length} account(s):\n`);
    
    accounts.forEach((account: any, index: number) => {
      console.log(`Account ${index + 1}:`);
      console.log(`  ID: ${account.id}`);
      console.log(`  Label: ${account.label}`);
      console.log(`  Type: ${account.type || 'N/A'}`);
      console.log(`  Currency: ${account.ticker || 'N/A'}`);
      console.log(`  IBAN: ${account.iban || 'N/A'}`);
      console.log(`  Status: ${account.status || 'N/A'}`);
      console.log('');
    });

    // Now try to get balances for EACH account
    console.log('\n📊 Step 2: Get balances for each account');
    console.log('==========================================\n');

    for (const account of accounts) {
      console.log(`\nTrying account ${account.id} (${account.label})...`);
      try {
        // @ts-ignore
        const balances = await adapter.request('GET', `/v3/balances/${account.id}`);
        console.log(`✅ SUCCESS! Got ${balances.length} balance(s)`);
        
        balances.forEach((bal: any, idx: number) => {
          console.log(`  Balance ${idx + 1}:`);
          console.log(`    IBAN: ${bal.iban || 'N/A'}`);
          console.log(`    Amount: ${bal.balance} ${bal.ticker}`);
          console.log(`    Account Name: ${bal.account_name || 'N/A'}`);
        });
      } catch (error: any) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }

    // Try Client API for each account
    console.log('\n\n📊 Step 3: Try Client API for Virtual IBANs');
    console.log('=============================================\n');

    for (const account of accounts) {
      console.log(`\nTrying Client API for account ${account.id}...`);
      try {
        // @ts-ignore
        const virtualAccounts = await adapter.clientApiRequest(
          'GET',
          `/v1/accounts/${account.id}/virtual/all-account-data`
        );
        console.log(`✅ SUCCESS! Got Virtual IBANs`);
        console.log(JSON.stringify(virtualAccounts, null, 2));
      } catch (error: any) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

listAllAccounts()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

