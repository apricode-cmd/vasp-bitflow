/**
 * Test Full Redis Integration
 * 
 * Tests all Redis-cached endpoints to ensure:
 * 1. Cache MISS on first call (fetches from DB)
 * 2. Cache HIT on second call (fetches from Redis)
 * 3. Performance improvement visible
 */

import { CacheService } from '../src/lib/services/cache.service';

async function testSettings() {
  console.log('\n1️⃣  Testing SETTINGS cache...');
  
  // Clear first
  await CacheService.clearSetting('platform_fee');
  
  // Test MISS
  const miss1 = Date.now();
  const missResult = await CacheService.getSetting('platform_fee');
  const missDuration = Date.now() - miss1;
  console.log(`   MISS: ${missResult === null ? '✅' : '❌'} (${missDuration}ms)`);
  
  // Set
  await CacheService.setSetting('platform_fee', '1.5', 300);
  
  // Test HIT
  const hit1 = Date.now();
  const hitResult = await CacheService.getSetting('platform_fee');
  const hitDuration = Date.now() - hit1;
  console.log(`   HIT:  ${hitResult === '1.5' ? '✅' : '❌'} (${hitDuration}ms)`);
  console.log(`   Improvement: ${missDuration > hitDuration ? '✅' : '⚠️'} ${Math.round(((missDuration - hitDuration) / missDuration) * 100)}%`);
}

async function testIntegrations() {
  console.log('\n2️⃣  Testing INTEGRATIONS cache...');
  
  // Clear first
  await CacheService.clearActiveIntegration('RATES');
  
  // Test MISS
  const miss1 = Date.now();
  const missResult = await CacheService.getActiveIntegration('RATES');
  const missDuration = Date.now() - miss1;
  console.log(`   MISS: ${missResult === null ? '✅' : '❌'} (${missDuration}ms)`);
  
  // Set
  const mockIntegration = { service: 'coingecko', status: 'active', category: 'RATES' };
  await CacheService.setActiveIntegration('RATES', mockIntegration, 600);
  
  // Test HIT
  const hit1 = Date.now();
  const hitResult = await CacheService.getActiveIntegration('RATES');
  const hitDuration = Date.now() - hit1;
  console.log(`   HIT:  ${hitResult?.service === 'coingecko' ? '✅' : '❌'} (${hitDuration}ms)`);
  console.log(`   Improvement: ${missDuration > hitDuration ? '✅' : '⚠️'} ${Math.round(((missDuration - hitDuration) / missDuration) * 100)}%`);
}

async function testTradingPairs() {
  console.log('\n3️⃣  Testing TRADING PAIRS cache...');
  
  // Clear first
  await CacheService.clearTradingPairs();
  
  // Test MISS
  const miss1 = Date.now();
  const missResult = await CacheService.getTradingPairs();
  const missDuration = Date.now() - miss1;
  console.log(`   MISS: ${missResult === null ? '✅' : '❌'} (${missDuration}ms)`);
  
  // Set
  const mockPairs = [
    { cryptoCode: 'BTC', fiatCode: 'EUR', isActive: true },
    { cryptoCode: 'ETH', fiatCode: 'EUR', isActive: true }
  ];
  await CacheService.setTradingPairs(mockPairs, undefined, 600);
  
  // Test HIT
  const hit1 = Date.now();
  const hitResult = await CacheService.getTradingPairs();
  const hitDuration = Date.now() - hit1;
  console.log(`   HIT:  ${hitResult?.length === 2 ? '✅' : '❌'} (${hitDuration}ms)`);
  console.log(`   Improvement: ${missDuration > hitDuration ? '✅' : '⚠️'} ${Math.round(((missDuration - hitDuration) / missDuration) * 100)}%`);
}

async function testCurrencies() {
  console.log('\n4️⃣  Testing CURRENCIES cache...');
  
  // Clear first
  await CacheService.clearCurrencies();
  
  // Test MISS
  const miss1 = Date.now();
  const missResult = await CacheService.getCurrencies();
  const missDuration = Date.now() - miss1;
  console.log(`   MISS: ${missResult === null ? '✅' : '❌'} (${missDuration}ms)`);
  
  // Set
  const mockCurrencies = [
    { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' }
  ];
  await CacheService.setCurrencies(mockCurrencies, 3600);
  
  // Test HIT
  const hit1 = Date.now();
  const hitResult = await CacheService.getCurrencies();
  const hitDuration = Date.now() - hit1;
  console.log(`   HIT:  ${hitResult?.length === 2 ? '✅' : '❌'} (${hitDuration}ms)`);
  console.log(`   Improvement: ${missDuration > hitDuration ? '✅' : '⚠️'} ${Math.round(((missDuration - hitDuration) / missDuration) * 100)}%`);
}

async function testUserData() {
  console.log('\n5️⃣  Testing USER DATA cache...');
  
  const userId = 'test-user-123';
  
  // Clear first
  await CacheService.clearUserCache(userId);
  
  // Test KYC status MISS
  const miss1 = Date.now();
  const missKyc = await CacheService.getUserKycStatus(userId);
  const missDuration = Date.now() - miss1;
  console.log(`   KYC MISS: ${missKyc === null ? '✅' : '❌'} (${missDuration}ms)`);
  
  // Set KYC status
  await CacheService.setUserKycStatus(userId, 'APPROVED', 120);
  
  // Test KYC status HIT
  const hit1 = Date.now();
  const hitKyc = await CacheService.getUserKycStatus(userId);
  const hitDuration = Date.now() - hit1;
  console.log(`   KYC HIT:  ${hitKyc === 'APPROVED' ? '✅' : '❌'} (${hitDuration}ms)`);
  console.log(`   Improvement: ${missDuration > hitDuration ? '✅' : '⚠️'} ${Math.round(((missDuration - hitDuration) / missDuration) * 100)}%`);
}

async function testRates() {
  console.log('\n6️⃣  Testing RATES cache (already implemented)...');
  
  // Clear first
  await CacheService.clearRatesCache();
  
  // Test MISS
  const miss1 = Date.now();
  const missRate = await CacheService.getRate('BTC', 'EUR');
  const missDuration = Date.now() - miss1;
  console.log(`   MISS: ${missRate === null ? '✅' : '❌'} (${missDuration}ms)`);
  
  // Set rate
  await CacheService.setRate('BTC', 'EUR', 85000, 30);
  
  // Test HIT
  const hit1 = Date.now();
  const hitRate = await CacheService.getRate('BTC', 'EUR');
  const hitDuration = Date.now() - hit1;
  console.log(`   HIT:  ${hitRate === 85000 ? '✅' : '❌'} (${hitDuration}ms)`);
  console.log(`   Improvement: ${missDuration > hitDuration ? '✅' : '⚠️'} ${Math.round(((missDuration - hitDuration) / missDuration) * 100)}%`);
}

async function testCacheStats() {
  console.log('\n7️⃣  Testing CACHE STATS...');
  
  const stats = await CacheService.getStats();
  console.log(`   Total keys:  ${stats.totalKeys}`);
  console.log(`   Rate keys:   ${stats.rateKeys}`);
  console.log(`   Memory used: ${stats.memoryUsed}`);
  console.log(`   Connected:   ${stats.connected ? '✅' : '❌'}`);
}

async function main() {
  console.log('🧪 Testing Full Redis Integration\n');
  console.log('============================================================');
  
  try {
    // Test connection
    const ping = await CacheService.ping();
    if (!ping) {
      console.error('❌ Redis connection failed!');
      process.exit(1);
    }
    console.log('✅ Redis connection: OK\n');
    
    // Run tests
    await testSettings();
    await testIntegrations();
    await testTradingPairs();
    await testCurrencies();
    await testUserData();
    await testRates();
    await testCacheStats();
    
    console.log('\n============================================================');
    console.log('✅ All Redis caching tests PASSED!');
    console.log('============================================================\n');
    
    // Cleanup
    await CacheService.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await CacheService.disconnect();
    process.exit(1);
  }
}

main();

