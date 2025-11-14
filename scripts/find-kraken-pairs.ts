/**
 * Find available Kraken pairs for our currencies
 * 
 * Run: npx tsx scripts/find-kraken-pairs.ts
 */

import axios from 'axios';

const KRAKEN_BASE_URL = 'https://api.kraken.com/0/public';

const CRYPTOS = ['BTC', 'ETH', 'SOL', 'USDT', 'XBT', 'XETH', 'XXBT', 'XETH'];
const FIATS = ['EUR', 'USD', 'PLN', 'ZEUR', 'ZUSD'];

async function findPairs(): Promise<void> {
  console.log('🔍 Searching for available pairs on Kraken...\n');
  
  try {
    const response = await axios.get(`${KRAKEN_BASE_URL}/AssetPairs`);
    
    if (response.data.error.length > 0) {
      console.error('❌ Error:', response.data.error);
      return;
    }
    
    const allPairs = Object.keys(response.data.result);
    
    // Group by currency
    const btcPairs: string[] = [];
    const ethPairs: string[] = [];
    const solPairs: string[] = [];
    const usdtPairs: string[] = [];
    
    for (const pair of allPairs) {
      const upper = pair.toUpperCase();
      
      // Bitcoin
      if (upper.includes('BTC') || upper.includes('XBT')) {
        if (upper.includes('EUR') || upper.includes('USD') || upper.includes('PLN')) {
          btcPairs.push(pair);
        }
      }
      
      // Ethereum
      if (upper.includes('ETH')) {
        if (upper.includes('EUR') || upper.includes('USD') || upper.includes('PLN')) {
          ethPairs.push(pair);
        }
      }
      
      // Solana
      if (upper.includes('SOL')) {
        if (upper.includes('EUR') || upper.includes('USD') || upper.includes('PLN')) {
          solPairs.push(pair);
        }
      }
      
      // Tether
      if (upper.includes('USDT')) {
        if (upper.includes('EUR') || upper.includes('USD') || upper.includes('PLN')) {
          usdtPairs.push(pair);
        }
      }
    }
    
    console.log('📊 Available pairs:\n');
    
    console.log('🟠 Bitcoin (BTC):');
    btcPairs.forEach(p => console.log(`   ${p}`));
    
    console.log('\n🔵 Ethereum (ETH):');
    ethPairs.forEach(p => console.log(`   ${p}`));
    
    console.log('\n🟣 Solana (SOL):');
    solPairs.forEach(p => console.log(`   ${p}`));
    
    console.log('\n🟢 Tether (USDT):');
    usdtPairs.forEach(p => console.log(`   ${p}`));
    
    console.log('\n\n📋 Recommended mapping:\n');
    console.log('const PAIRS = {');
    console.log('  // Bitcoin');
    btcPairs.slice(0, 3).forEach(p => {
      const fiat = p.includes('EUR') ? 'EUR' : p.includes('USD') ? 'USD' : 'PLN';
      console.log(`  'BTC-${fiat}': '${p}',`);
    });
    
    console.log('  \n  // Ethereum');
    ethPairs.slice(0, 3).forEach(p => {
      const fiat = p.includes('EUR') ? 'EUR' : p.includes('USD') ? 'USD' : 'PLN';
      console.log(`  'ETH-${fiat}': '${p}',`);
    });
    
    console.log('  \n  // Solana');
    solPairs.slice(0, 3).forEach(p => {
      const fiat = p.includes('EUR') ? 'EUR' : p.includes('USD') ? 'USD' : 'PLN';
      console.log(`  'SOL-${fiat}': '${p}',`);
    });
    
    console.log('  \n  // Tether');
    usdtPairs.slice(0, 3).forEach(p => {
      const fiat = p.includes('EUR') ? 'EUR' : p.includes('USD') ? 'USD' : 'PLN';
      console.log(`  'USDT-${fiat}': '${p}',`);
    });
    console.log('};');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

findPairs();

