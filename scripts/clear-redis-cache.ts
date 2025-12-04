/**
 * Clear Redis Cache
 * 
 * Clears all cached data including trading pairs, currencies, rates, etc.
 */

import { CacheService } from '../src/lib/services/cache.service';

async function main() {
  console.log('🔄 Clearing Redis cache...\n');

  try {
    // Clear trading pairs cache
    const tradingPairsCleared = await CacheService.clearTradingPairs();
    console.log(`✅ Cleared trading pairs cache: ${tradingPairsCleared} keys`);

    // Clear currencies cache
    await CacheService.deleteCurrencies();
    console.log('✅ Cleared currencies cache');

    // Clear fiat currencies cache
    await CacheService.deleteFiatCurrencies();
    console.log('✅ Cleared fiat currencies cache');

    console.log('\n✅ Cache cleared successfully!');
    console.log('\n💡 Tip: The cache will be rebuilt automatically on the next API request.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

main();

