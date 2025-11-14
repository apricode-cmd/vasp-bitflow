/**
 * Check Integration table status
 * 
 * Run: npx tsx scripts/check-integrations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIntegrations(): Promise<void> {
  console.log('🔍 Checking Integration table...\n');
  
  try {
    // Get all integrations
    const allIntegrations = await prisma.integration.findMany({
      orderBy: [
        { category: 'asc' },
        { service: 'asc' }
      ]
    });
    
    console.log(`📊 Total integrations in database: ${allIntegrations.length}\n`);
    
    // Group by category
    const byCategory = allIntegrations.reduce((acc, int) => {
      if (!acc[int.category]) {
        acc[int.category] = [];
      }
      acc[int.category].push(int);
      return acc;
    }, {} as Record<string, typeof allIntegrations>);
    
    // Display by category
    for (const [category, integrations] of Object.entries(byCategory)) {
      console.log(`\n📁 ${category}:`);
      console.log('─'.repeat(80));
      
      for (const int of integrations) {
        const status = int.isEnabled ? '🟢' : '⚪';
        const statusText = int.isEnabled ? 'ENABLED' : 'disabled';
        
        console.log(`${status} ${int.service.padEnd(15)} | ${int.status.padEnd(10)} | ${statusText.padEnd(10)} | ${int.apiEndpoint || 'N/A'}`);
      }
    }
    
    // Check RATES providers specifically
    console.log('\n\n🎯 RATES Providers (detailed):\n');
    console.log('─'.repeat(80));
    
    const ratesProviders = await prisma.integration.findMany({
      where: { category: 'RATES' }
    });
    
    if (ratesProviders.length === 0) {
      console.log('❌ NO RATES PROVIDERS FOUND IN DATABASE!');
      console.log('\n💡 Solution:');
      console.log('   Run: npx prisma db execute --stdin < prisma/migrations-manual/add-kraken-integration.sql');
    } else {
      for (const provider of ratesProviders) {
        console.log(`\nService: ${provider.service}`);
        console.log(`  ID: ${provider.id}`);
        console.log(`  Enabled: ${provider.isEnabled ? '✅ YES' : '❌ NO'}`);
        console.log(`  Status: ${provider.status}`);
        console.log(`  API Endpoint: ${provider.apiEndpoint || 'N/A'}`);
        console.log(`  Last Tested: ${provider.lastTested?.toISOString() || 'Never'}`);
        console.log(`  Config: ${provider.config ? JSON.stringify(provider.config, null, 2) : 'None'}`);
        console.log(`  Created: ${provider.createdAt.toISOString()}`);
        console.log(`  Updated: ${provider.updatedAt.toISOString()}`);
      }
      
      // Check for active provider
      const activeProvider = await prisma.integration.findFirst({
        where: {
          category: 'RATES',
          isEnabled: true,
          status: 'active'
        }
      });
      
      console.log('\n\n🔍 Active RATES Provider Check:');
      console.log('─'.repeat(80));
      
      if (activeProvider) {
        console.log(`✅ FOUND: ${activeProvider.service}`);
        console.log(`   This provider will be used for all rate requests.`);
      } else {
        console.log('❌ NO ACTIVE RATES PROVIDER!');
        console.log('\n💡 Solution:');
        console.log('   1. Go to /admin/integrations');
        console.log('   2. Find a RATES provider (CoinGecko or Kraken)');
        console.log('   3. Click "Enable"');
        console.log('\n   OR run SQL:');
        console.log(`   UPDATE "Integration" SET "isEnabled" = true WHERE service = 'coingecko';`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'P2021') {
      console.log('\n💡 Table "Integration" does not exist!');
      console.log('   Run: npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegrations();

