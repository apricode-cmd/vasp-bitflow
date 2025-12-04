/**
 * Check Segregated Account Balance
 */

import { BCBGroupAdapter } from '../src/lib/integrations/providers/virtual-iban/BCBGroupAdapter';

async function checkSegregatedBalance() {
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

  console.log('📊 Checking Segregated Account Balance\n');
  console.log('Segregated Account ID: 94092443');
  console.log('Type: EUR (VIRTUAL)\n');

  // Get balance
  // @ts-ignore
  const balances = await adapter.request('GET', '/v3/balances/94092443');
  
  console.log('Full Response:');
  console.log(JSON.stringify(balances, null, 2));
  
  console.log('\n📊 Summary:');
  balances.forEach((bal: any) => {
    console.log(`Account ID: ${bal.account_id}`);
    console.log(`IBAN: ${bal.iban || 'N/A'}`);
    console.log(`Balance: ${bal.balance} ${bal.ticker}`);
    console.log(`Account Name: ${bal.account_name}`);
  });
  
  console.log('\n💡 This is the TOTAL balance for the segregated account');
  console.log('   All Virtual IBANs share this pool of funds');
}

checkSegregatedBalance().catch(console.error);

