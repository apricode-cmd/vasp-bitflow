#!/usr/bin/env tsx

/**
 * Test BCB Group API - Get Payments
 * 
 * This script tests the BCB API endpoints to fetch payments/transactions
 * and helps diagnose issues with the Virtual IBAN payment sync.
 * 
 * Usage: npx tsx scripts/test-bcb-payments.ts <client_id> <client_secret> <counterparty_id> <segregated_account_id>
 */

// Get credentials from command line arguments
const clientId = process.argv[2];
const clientSecret = process.argv[3];
const counterpartyId = process.argv[4] || '13608';
const segregatedAccountId = process.argv[5] || '17218';

interface BCBOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface BCBPayment {
  transactionId: string;
  virtualAccountId: string;
  amount: number;
  currency: string;
  credit: boolean;
  valueDate: string;
  details: {
    reference?: string;
    endToEndId?: string;
    iban?: string;
    accountName?: string;
  };
  status: string;
  createdAt: string;
}

interface PagedPaymentResponse {
  results: BCBPayment[];
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

/**
 * Fetch with timeout to prevent hanging
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Get OAuth token from BCB
 */
async function authenticate(): Promise<string> {
  const baseUrl = 'https://api.uat.bcb.group';
  const authUrl = 'https://auth.uat.bcb.group/oauth/token';

  if (!clientId || !clientSecret) {
    throw new Error('Missing BCB credentials in environment');
  }

  console.log('🔐 Authenticating with BCB...');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Auth URL: ${authUrl}`);

  const response = await fetchWithTimeout(
    authUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: baseUrl,
        grant_type: 'client_credentials',
      }),
    },
    15000
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${response.status} ${error}`);
  }

  const data: BCBOAuthResponse = await response.json();
  console.log('✅ Authenticated successfully');
  console.log(`   Token expires in: ${data.expires_in}s`);

  return data.access_token;
}

/**
 * Test 1: Get Segregated Account Info (Services API)
 */
async function testGetAccounts(token: string, counterpartyId: string): Promise<void> {
  console.log('\n📋 TEST 1: Get Accounts (Services API v3)');
  console.log('='.repeat(60));

  const url = `https://api.uat.bcb.group/v3/accounts?counterparty_id=${counterpartyId}&limit=10`;
  console.log(`GET ${url}`);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      30000
    );

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${error}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Found ${data.length || 0} account(s)`);
    
    if (data.length > 0) {
      data.forEach((account: any, i: number) => {
        console.log(`\n   Account ${i + 1}:`);
        console.log(`   - ID: ${account.id}`);
        console.log(`   - Type: ${account.account_type}`);
        console.log(`   - Currency: ${account.ccy}`);
        console.log(`   - IBAN: ${account.iban || 'N/A'}`);
        console.log(`   - Label: ${account.account_label || 'N/A'}`);
        console.log(`   - BCB Controlled: ${account.bcb_controlled === 1 ? 'Yes' : 'No'}`);
      });
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error);
  }
}

/**
 * Test 2: Get Virtual Accounts (Client API)
 */
async function testGetVirtualAccounts(token: string, segregatedAccountId: string): Promise<string | null> {
  console.log('\n📋 TEST 2: Get Virtual Accounts (Client API v1)');
  console.log('='.repeat(60));

  const url = `https://client-api.uat.bcb.group/v1/accounts/${segregatedAccountId}/virtual/all-account-data`;
  console.log(`GET ${url}`);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      30000
    );

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${error}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Found ${data.count || 0} virtual account(s)`);
    
    if (data.results && data.results.length > 0) {
      const firstAccount = data.results[0];
      console.log(`\n   Virtual Account 1:`);
      console.log(`   - ID: ${firstAccount.virtualAccountDetails.id}`);
      console.log(`   - Status: ${firstAccount.virtualAccountDetails.status}`);
      console.log(`   - IBAN: ${firstAccount.virtualAccountDetails.iban || 'PENDING'}`);
      console.log(`   - BIC: ${firstAccount.virtualAccountDetails.bic || 'N/A'}`);
      console.log(`   - Account Number: ${firstAccount.virtualAccountDetails.accountNumber || 'N/A'}`);
      console.log(`   - Owner: ${firstAccount.ownerDetails.name}`);
      
      return firstAccount.virtualAccountDetails.id; // Return Virtual Account ID
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Request failed:`, error);
    return null;
  }
}

/**
 * Test 3: Get Payments for Segregated Account (Client API)
 */
async function testGetPayments(
  token: string, 
  segregatedAccountId: string,
  virtualAccountId?: string
): Promise<void> {
  console.log('\n💰 TEST 3: Get Payments (Client API v1)');
  console.log('='.repeat(60));

  // Try different date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const url = `https://client-api.uat.bcb.group/v1/accounts/${segregatedAccountId}/payments?dateFrom=${thirtyDaysAgo.toISOString()}&pageSize=100`;
  console.log(`GET ${url}`);
  console.log(`Date range: ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      30000
    );

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${error}`);
      return;
    }

    const data: PagedPaymentResponse = await response.json();
    console.log(`✅ Found ${data.results?.length || 0} payment(s)`);
    console.log(`   Total Records: ${data.totalRecords || 0}`);
    console.log(`   Page: ${data.pageIndex || 0}/${data.totalPages || 0}`);
    
    if (data.results && data.results.length > 0) {
      // Filter by virtual account if provided
      let payments = data.results;
      if (virtualAccountId) {
        payments = payments.filter(p => p.virtualAccountId === virtualAccountId);
        console.log(`   Filtered for Virtual Account ${virtualAccountId}: ${payments.length} payment(s)`);
      }
      
      payments.slice(0, 5).forEach((payment, i) => {
        console.log(`\n   Payment ${i + 1}:`);
        console.log(`   - Transaction ID: ${payment.transactionId}`);
        console.log(`   - Virtual Account ID: ${payment.virtualAccountId}`);
        console.log(`   - Type: ${payment.credit ? 'CREDIT (incoming)' : 'DEBIT (outgoing)'}`);
        console.log(`   - Amount: ${payment.amount} ${payment.currency}`);
        console.log(`   - Status: ${payment.status}`);
        console.log(`   - Value Date: ${payment.valueDate}`);
        console.log(`   - Reference: ${payment.details.reference || 'N/A'}`);
        console.log(`   - Sender IBAN: ${payment.details.iban || 'N/A'}`);
        console.log(`   - Sender Name: ${payment.details.accountName || 'N/A'}`);
        console.log(`   - Created: ${payment.createdAt}`);
      });
      
      if (payments.length > 5) {
        console.log(`\n   ... and ${payments.length - 5} more payment(s)`);
      }
    } else {
      console.log(`\n   ℹ️  No payments found in the last 30 days`);
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error);
  }
}

/**
 * Test 4: Get Balances (Services API v3)
 */
async function testGetBalances(token: string, segregatedAccountId: string): Promise<void> {
  console.log('\n💵 TEST 4: Get Balances (Services API v3)');
  console.log('='.repeat(60));

  const url = `https://api.uat.bcb.group/v3/balances/${segregatedAccountId}`;
  console.log(`GET ${url}`);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      30000
    );

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${error}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Found ${data.length || 0} balance(s)`);
    
    if (data.length > 0) {
      data.forEach((balance: any, i: number) => {
        console.log(`\n   Balance ${i + 1}:`);
        console.log(`   - Account ID: ${balance.account_id}`);
        console.log(`   - Currency: ${balance.ticker}`);
        console.log(`   - Balance: ${balance.balance}`);
        console.log(`   - IBAN: ${balance.iban || 'N/A'}`);
        console.log(`   - Account Name: ${balance.account_name || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 BCB Group API Payment Test');
  console.log('='.repeat(60));

  const cpId = counterpartyId || '13608';
  const segAccId = segregatedAccountId || '17218';

  console.log(`\n📌 Configuration:`);
  console.log(`   Counterparty ID: ${cpId}`);
  console.log(`   Segregated Account ID: ${segAccId}`);
  console.log(`   Environment: SANDBOX (UAT)`);

  try {
    // Step 1: Authenticate
    const token = await authenticate();

    // Step 2: Get accounts info
    await testGetAccounts(token, cpId);

    // Step 3: Get virtual accounts
    const virtualAccountId = await testGetVirtualAccounts(token, segAccId);

    // Step 4: Get payments
    await testGetPayments(token, segAccId, virtualAccountId || undefined);

    // Step 5: Get balances
    await testGetBalances(token, segAccId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main();

