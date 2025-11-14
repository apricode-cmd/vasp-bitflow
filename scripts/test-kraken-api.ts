/**
 * Test Kraken Public API
 * 
 * This script tests the Kraken public ticker API to verify:
 * 1. Connection works
 * 2. We can fetch real-time rates
 * 3. Response format is correct
 * 4. All our supported pairs are available
 * 
 * Run: npx tsx scripts/test-kraken-api.ts
 */

import axios from 'axios';

const KRAKEN_BASE_URL = 'https://api.kraken.com/0/public';

// Kraken pair notation mapping (CORRECTED after API test)
const PAIRS = {
  // Bitcoin
  'BTC-EUR': 'XXBTZEUR',
  'BTC-USD': 'XXBTZUSD',
  // 'BTC-PLN': Not available on Kraken
  
  // Ethereum
  'ETH-EUR': 'XETHZEUR',
  'ETH-USD': 'XETHZUSD',
  // 'ETH-PLN': Not available on Kraken
  
  // Solana
  'SOL-EUR': 'SOLEUR',
  'SOL-USD': 'SOLUSD',
  // 'SOL-PLN': Not available on Kraken
  
  // Tether (stablecoin)
  'USDT-EUR': 'USDTEUR',   // FIXED: was USDTZEUR
  'USDT-USD': 'USDTZUSD',
  // 'USDT-PLN': Not available on Kraken
};

interface KrakenTickerData {
  a: string[];  // Ask [price, whole lot volume, lot volume]
  b: string[];  // Bid [price, whole lot volume, lot volume]
  c: string[];  // Last trade closed [price, lot volume]
  v: string[];  // Volume [today, last 24h]
  p: string[];  // Volume weighted average price [today, last 24h]
  t: number[];  // Number of trades [today, last 24h]
  l: string[];  // Low [today, last 24h]
  h: string[];  // High [today, last 24h]
  o: string;    // Today's opening price
}

interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: KrakenTickerData;
  };
}

async function testServerTime(): Promise<boolean> {
  console.log('🕐 Testing Kraken server connection...');
  
  try {
    const response = await axios.get<{ error: string[]; result: { unixtime: number; rfc1123: string } }>(
      `${KRAKEN_BASE_URL}/Time`
    );
    
    if (response.data.error.length > 0) {
      console.error('❌ Error:', response.data.error);
      return false;
    }
    
    const serverTime = new Date(response.data.result.unixtime * 1000);
    console.log('✅ Connection successful!');
    console.log(`   Server time: ${serverTime.toISOString()}`);
    console.log(`   RFC1123: ${response.data.result.rfc1123}`);
    return true;
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function testSinglePair(ourPair: string, krakenPair: string): Promise<void> {
  try {
    const response = await axios.get<KrakenTickerResponse>(
      `${KRAKEN_BASE_URL}/Ticker`,
      { params: { pair: krakenPair } }
    );
    
    if (response.data.error.length > 0) {
      console.log(`   ❌ ${ourPair} (${krakenPair}): ${response.data.error.join(', ')}`);
      return;
    }
    
    const ticker = response.data.result[krakenPair];
    
    if (!ticker) {
      console.log(`   ⚠️  ${ourPair} (${krakenPair}): No data returned`);
      return;
    }
    
    const lastPrice = parseFloat(ticker.c[0]);
    const volume24h = parseFloat(ticker.v[1]);
    const high24h = parseFloat(ticker.h[1]);
    const low24h = parseFloat(ticker.l[1]);
    const openPrice = parseFloat(ticker.o);
    const change24h = ((lastPrice - openPrice) / openPrice * 100).toFixed(2);
    
    console.log(`   ✅ ${ourPair.padEnd(10)} → ${krakenPair.padEnd(12)} | Price: ${lastPrice.toFixed(2).padStart(12)} | 24h Change: ${change24h.padStart(7)}% | Volume: ${volume24h.toFixed(2)}`);
  } catch (error: any) {
    console.log(`   ❌ ${ourPair} (${krakenPair}): ${error.message}`);
  }
}

async function testAllPairs(): Promise<void> {
  console.log('\n📊 Testing individual pairs...\n');
  
  for (const [ourPair, krakenPair] of Object.entries(PAIRS)) {
    await testSinglePair(ourPair, krakenPair);
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function testBulkFetch(): Promise<void> {
  console.log('\n🚀 Testing bulk fetch (all pairs in one request)...\n');
  
  const startTime = Date.now();
  const allPairs = Object.values(PAIRS).join(',');
  
  try {
    const response = await axios.get<KrakenTickerResponse>(
      `${KRAKEN_BASE_URL}/Ticker`,
      { params: { pair: allPairs } }
    );
    
    const fetchTime = Date.now() - startTime;
    
    if (response.data.error.length > 0) {
      console.error('❌ Bulk fetch failed:', response.data.error);
      return;
    }
    
    console.log(`✅ Bulk fetch successful in ${fetchTime}ms`);
    console.log(`   Pairs requested: ${Object.keys(PAIRS).length}`);
    console.log(`   Pairs received: ${Object.keys(response.data.result).length}`);
    
    console.log('\n📈 Results:\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const [ourPair, krakenPair] of Object.entries(PAIRS)) {
      const ticker = response.data.result[krakenPair];
      
      if (ticker) {
        const lastPrice = parseFloat(ticker.c[0]);
        const volume24h = parseFloat(ticker.v[1]);
        console.log(`   ✅ ${ourPair.padEnd(10)} | ${lastPrice.toFixed(6).padStart(14)} | Vol: ${volume24h.toFixed(2)}`);
        successCount++;
      } else {
        console.log(`   ❌ ${ourPair.padEnd(10)} | Not available`);
        failCount++;
      }
    }
    
    console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed`);
    
  } catch (error: any) {
    console.error('❌ Bulk fetch error:', error.message);
  }
}

async function testAssetPairs(): Promise<void> {
  console.log('\n🔍 Fetching available asset pairs...\n');
  
  try {
    const response = await axios.get(`${KRAKEN_BASE_URL}/AssetPairs`);
    
    if (response.data.error.length > 0) {
      console.error('❌ Error:', response.data.error);
      return;
    }
    
    const allPairs = Object.keys(response.data.result);
    console.log(`✅ Total pairs available: ${allPairs.length}`);
    
    // Check if our pairs exist
    console.log('\n📋 Checking our required pairs:\n');
    
    for (const [ourPair, krakenPair] of Object.entries(PAIRS)) {
      const exists = allPairs.includes(krakenPair);
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${ourPair.padEnd(10)} → ${krakenPair.padEnd(12)} ${exists ? '(Available)' : '(NOT FOUND!)'}`);
    }
    
  } catch (error: any) {
    console.error('❌ Failed to fetch asset pairs:', error.message);
  }
}

async function testRateComparison(): Promise<void> {
  console.log('\n💰 Comparing BTC/EUR rates across methods...\n');
  
  try {
    // Method 1: Single pair request
    const start1 = Date.now();
    const response1 = await axios.get<KrakenTickerResponse>(
      `${KRAKEN_BASE_URL}/Ticker`,
      { params: { pair: 'XXBTZEUR' } }
    );
    const time1 = Date.now() - start1;
    const price1 = parseFloat(response1.data.result['XXBTZEUR'].c[0]);
    
    // Method 2: Bulk request
    const start2 = Date.now();
    const response2 = await axios.get<KrakenTickerResponse>(
      `${KRAKEN_BASE_URL}/Ticker`,
      { params: { pair: Object.values(PAIRS).join(',') } }
    );
    const time2 = Date.now() - start2;
    const price2 = parseFloat(response2.data.result['XXBTZEUR'].c[0]);
    
    console.log(`   Single request: ${price1.toFixed(2)} EUR (${time1}ms)`);
    console.log(`   Bulk request:   ${price2.toFixed(2)} EUR (${time2}ms)`);
    console.log(`   Difference:     ${Math.abs(price1 - price2).toFixed(2)} EUR`);
    console.log(`   Time saved:     ${time1 * Object.keys(PAIRS).length - time2}ms (bulk is faster!)`);
    
  } catch (error: any) {
    console.error('❌ Comparison failed:', error.message);
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Kraken Public API Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // Test 1: Server connection
  const connectionOk = await testServerTime();
  
  if (!connectionOk) {
    console.error('\n❌ Cannot connect to Kraken API. Aborting tests.\n');
    process.exit(1);
  }
  
  // Test 2: Available asset pairs
  await testAssetPairs();
  
  // Test 3: Individual pair requests
  await testAllPairs();
  
  // Test 4: Bulk fetch
  await testBulkFetch();
  
  // Test 5: Rate comparison
  await testRateComparison();
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   ✅ All tests completed!                              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Next steps:');
  console.log('   1. Apply migration: psql $DATABASE_URL -f prisma/migrations-manual/add-kraken-integration.sql');
  console.log('   2. Restart dev server: npm run dev');
  console.log('   3. Go to /admin/integrations');
  console.log('   4. Test & Enable Kraken Exchange\n');
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

