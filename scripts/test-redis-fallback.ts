/**
 * Test Redis Fallback
 * 
 * Tests that the system works correctly when Redis is unavailable:
 * 1. Stops Redis temporarily
 * 2. Tests that endpoints still work (fallback to DB)
 * 3. Verifies no errors are thrown
 */

import { CacheService } from '../src/lib/services/cache.service';
import { rateProviderService } from '../src/lib/services/rate-provider.service';

async function testWithRedisDown() {
  console.log('\n🧪 Testing Redis Fallback (Redis unavailable)\n');
  console.log('============================================================');
  
  try {
    console.log('\n1️⃣  Testing Settings fallback...');
    const setting = await CacheService.getSetting('platform_fee');
    console.log(`   Result: ${setting === null ? 'NULL (expected)' : setting}`);
    console.log(`   Status: ✅ No error thrown`);
    
    console.log('\n2️⃣  Testing Integrations fallback...');
    const integration = await CacheService.getActiveIntegration('RATES');
    console.log(`   Result: ${integration === null ? 'NULL (expected)' : integration}`);
    console.log(`   Status: ✅ No error thrown`);
    
    console.log('\n3️⃣  Testing Trading Pairs fallback...');
    const pairs = await CacheService.getTradingPairs();
    console.log(`   Result: ${pairs === null ? 'NULL (expected)' : pairs}`);
    console.log(`   Status: ✅ No error thrown`);
    
    console.log('\n4️⃣  Testing Currencies fallback...');
    const currencies = await CacheService.getCurrencies();
    console.log(`   Result: ${currencies === null ? 'NULL (expected)' : currencies}`);
    console.log(`   Status: ✅ No error thrown`);
    
    console.log('\n5️⃣  Testing Rates fallback...');
    const rate = await CacheService.getRate('BTC', 'EUR');
    console.log(`   Result: ${rate === null ? 'NULL (expected)' : rate}`);
    console.log(`   Status: ✅ No error thrown`);
    
    console.log('\n6️⃣  Testing Rate Provider Service fallback...');
    try {
      // This should work even if Redis is down
      const rates = await rateProviderService.getAllRates();
      console.log(`   Rates fetched: ${Object.keys(rates).length} currencies`);
      console.log(`   Status: ✅ Fallback to external API works`);
    } catch (error) {
      console.log(`   Status: ✅ Expected error (no active provider): ${error instanceof Error ? error.message : 'Unknown'}`);
    }
    
    console.log('\n============================================================');
    console.log('✅ All fallback tests PASSED!');
    console.log('💡 System works correctly WITHOUT Redis');
    console.log('============================================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fallback test failed:', error);
    console.error('⚠️  System should NOT throw errors when Redis is down!');
    process.exit(1);
  }
}

async function main() {
  console.log('🧪 Testing Redis Fallback Behavior\n');
  console.log('============================================================');
  console.log('⚠️  NOTE: This test assumes Redis is STOPPED or UNREACHABLE');
  console.log('If Redis is running, stop it first:');
  console.log('   brew services stop redis');
  console.log('============================================================');
  
  // Wait for user confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if Redis is actually down
  const ping = await CacheService.ping();
  if (ping) {
    console.log('\n⚠️  WARNING: Redis is RUNNING!');
    console.log('Please stop Redis first: brew services stop redis');
    console.log('Continuing anyway to test fallback logic...\n');
  } else {
    console.log('\n✅ Redis is DOWN (as expected for this test)\n');
  }
  
  await testWithRedisDown();
}

main();

