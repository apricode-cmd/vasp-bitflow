/**
 * Show recent Virtual IBAN accounts from our database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showRecentAccounts() {
  try {
    const accounts = await prisma.virtualIbanAccount.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        providerAccountId: true,
        iban: true,
        status: true,
        createdAt: true,
        userId: true,
        metadata: true,
      }
    });

    console.log(`📊 Last 10 Virtual IBAN accounts in database:\n`);
    
    accounts.forEach((acc, index) => {
      const metadata = acc.metadata as any;
      const correlationId = metadata?.correlationId || metadata?.bcbCorrelationId || 'N/A';
      
      console.log(`${index + 1}. Account ID: ${acc.id}`);
      console.log(`   Provider ID: ${acc.providerAccountId}`);
      console.log(`   Correlation ID: ${correlationId}`);
      console.log(`   IBAN: ${acc.iban || 'PENDING'}`);
      console.log(`   Status: ${acc.status}`);
      console.log(`   Created: ${acc.createdAt.toISOString()}`);
      console.log(`   User ID: ${acc.userId}`);
      console.log('');
    });

    if (accounts.length > 0 && accounts[0].metadata) {
      const latestMetadata = accounts[0].metadata as any;
      const latestCorrelationId = latestMetadata?.correlationId || latestMetadata?.bcbCorrelationId;
      
      if (latestCorrelationId) {
        console.log('\n💡 To search for the latest correlationId in BCB data, run:');
        console.log(`   npx tsx scripts/search-correlation-id.ts ${latestCorrelationId}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showRecentAccounts();

