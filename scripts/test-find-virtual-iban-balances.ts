/**
 * Find how to get balance for individual Virtual IBAN
 */

import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';

async function findVirtualIbanBalances() {
  console.log('🔍 Finding individual Virtual IBAN balances...\n');

  const adapter = new BCBGroupAdapter();

  await adapter.initialize({
    sandbox: true,
    clientId: 'Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw',
    clientSecret: 'lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW',
    counterpartyId: '13608',
    segregatedAccountId: '94092443',
    baseUrl: 'https://api.uat.bcb.group',
    clientApiUrl: 'https://client-api.uat.bcb.group',
    authUrl: 'https://auth.uat.bcb.group/oauth/token',
  });

  console.log('✅ Adapter initialized\n');

  try {
    // Step 1: Get all accounts and find ones with our Virtual IBANs
    console.log('📊 Step 1: Get ALL accounts to find Virtual IBAN account IDs');
    console.log('============================================================\n');
    
    // @ts-ignore
    const allAccounts = await adapter.request('GET', '/v3/accounts?counterparty_id=13608&limit=100');
    
    console.log(`Total accounts: ${allAccounts.length}\n`);
    
    // Get our Virtual IBANs
    // @ts-ignore
    const virtualIbans = await adapter.clientApiRequest(
      'GET',
      `/v1/accounts/94092443/virtual/all-account-data`
    );
    
    const virtualIbansList = virtualIbans.results.map((va: any) => va.virtualAccountDetails.iban);
    console.log('Our Virtual IBANs:');
    virtualIbansList.forEach((iban: string) => console.log(`  - ${iban}`));
    console.log('');

    // Find matching accounts in /v3/accounts
    console.log('Matching Virtual IBANs in /v3/accounts:');
    console.log('=========================================\n');
    
    const matchedAccounts = allAccounts.filter((acc: any) => 
      virtualIbansList.includes(acc.iban)
    );

    if (matchedAccounts.length === 0) {
      console.log('❌ No matches found in /v3/accounts');
      console.log('\n💡 This means Virtual IBANs are NOT listed as separate accounts');
      console.log('💡 Balance tracking must be done differently\n');
    } else {
      console.log(`✅ Found ${matchedAccounts.length} matching accounts:\n`);
      
      for (const acc of matchedAccounts) {
        console.log(`Account ID: ${acc.id}`);
        console.log(`  IBAN: ${acc.iban}`);
        console.log(`  Status: ${acc.status}`);
        
        // Try to get balance for this specific account
        try {
          // @ts-ignore
          const balance = await adapter.request('GET', `/v3/balances/${acc.id}`);
          console.log(`  ✅ Balance: ${balance[0].balance} ${balance[0].ticker}`);
        } catch (error: any) {
          console.log(`  ❌ Balance: ${error.message}`);
        }
        console.log('');
      }
    }

    // Step 2: Check if transactions API has balance info
    console.log('\n📊 Step 2: Check transactions for balance calculation');
    console.log('====================================================\n');

    console.log('Trying: GET /v1/accounts/94092443/payments');
    try {
      // @ts-ignore
      const payments = await adapter.clientApiRequest(
        'GET',
        `/v1/accounts/94092443/payments?pageSize=10`
      );
      
      console.log(`✅ Got ${payments.count} payment(s)\n`);
      
      if (payments.results && payments.results.length > 0) {
        console.log('Sample transaction:');
        console.log(JSON.stringify(payments.results[0], null, 2));
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }

    // Summary
    console.log('\n\n🎯 CONCLUSION:');
    console.log('================\n');
    
    if (matchedAccounts.length === 0) {
      console.log('❌ Virtual IBANs do NOT have individual balances in BCB API');
      console.log('\n📝 Recommendations:');
      console.log('1. Track individual balances locally in our database');
      console.log('2. Use webhooks to update balances when transactions occur');
      console.log('3. Use segregated account total balance for validation');
      console.log('4. Calculate balances from transaction history if needed');
      console.log('\n⚠️  CRITICAL: We MUST track balances locally!');
    } else {
      console.log('✅ Virtual IBANs have individual account IDs and balances!');
      console.log('   Use /v3/balances/{virtualIbanAccountId} for each one');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

findVirtualIbanBalances()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

