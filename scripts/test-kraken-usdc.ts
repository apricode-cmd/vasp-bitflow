/**
 * Test Kraken API for USDC pairs
 */

import axios from 'axios';

const KRAKEN_BASE_URL = 'https://api.kraken.com/0/public';

async function testUSDC() {
  console.log('🔍 Searching for USDC pairs on Kraken...\n');
  
  try {
    const response = await axios.get(`${KRAKEN_BASE_URL}/AssetPairs`);
    const allPairs = Object.keys(response.data.result);
    
    const usdcPairs = allPairs.filter(pair => {
      const upper = pair.toUpperCase();
      return upper.includes('USDC') && (upper.includes('EUR') || upper.includes('USD'));
    });
    
    console.log(`📊 Found ${usdcPairs.length} USDC pairs:\n`);
    usdcPairs.forEach(pair => console.log(`   ${pair}`));
    
    if (usdcPairs.length === 0) {
      console.log('\n❌ USDC not available on Kraken!');
      console.log('\n💡 Solution: Use USDT instead (it\'s available) or keep CoinGecko for USDC');
    } else {
      console.log('\n✅ Testing USDC-EUR:');
      
      const testPair = usdcPairs.find(p => p.includes('EUR'));
      if (testPair) {
        const tickerResponse = await axios.get(`${KRAKEN_BASE_URL}/Ticker`, {
          params: { pair: testPair }
        });
        
        const ticker = tickerResponse.data.result[testPair];
        if (ticker) {
          console.log(`   Pair: ${testPair}`);
          console.log(`   Price: ${ticker.c[0]} EUR`);
          console.log(`   Volume: ${ticker.v[1]}`);
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testUSDC();

