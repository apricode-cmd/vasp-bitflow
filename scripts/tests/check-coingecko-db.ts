import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCoinGecko() {
  try {
    const integration = await prisma.integration.findFirst({
      where: { service: 'coingecko' }
    });

    console.log('📊 CoinGecko Integration in DB:', JSON.stringify(integration, null, 2));
    
    if (!integration) {
      console.log('❌ CoinGecko integration NOT FOUND in database!');
      console.log('✅ Creating CoinGecko integration...');
      
      const created = await prisma.integration.create({
        data: {
          service: 'coingecko',
          displayName: 'CoinGecko',
          isEnabled: true,
          status: 'active',
          apiEndpoint: 'https://api.coingecko.com/api/v3',
          config: JSON.stringify({
            description: 'Free cryptocurrency price API'
          })
        }
      });
      
      console.log('✅ Created:', JSON.stringify(created, null, 2));
    } else if (!integration.apiEndpoint || integration.apiEndpoint.trim() === '') {
      console.log('⚠️ apiEndpoint is EMPTY! Updating...');
      
      const updated = await prisma.integration.update({
        where: { id: integration.id },
        data: {
          apiEndpoint: 'https://api.coingecko.com/api/v3',
          status: 'active',
          isEnabled: true
        }
      });
      
      console.log('✅ Updated:', JSON.stringify(updated, null, 2));
    } else {
      console.log('✅ apiEndpoint is set:', integration.apiEndpoint);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCoinGecko();
