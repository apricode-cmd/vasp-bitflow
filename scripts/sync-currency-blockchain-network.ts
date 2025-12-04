/**
 * Sync CurrencyBlockchainNetwork from Production to Local
 * 
 * This script syncs the currency-blockchain network relationships
 * from production database to local database without data loss.
 */

import { PrismaClient } from '@prisma/client';

const prodDb = new PrismaClient({
  datasourceUrl: 'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10'
});

const localDb = new PrismaClient();

async function main() {
  console.log('🔄 Starting CurrencyBlockchainNetwork sync from production...\n');

  try {
    // 1. Fetch from production
    console.log('📥 Fetching CurrencyBlockchainNetwork from production...');
    const prodRecords = await prodDb.currencyBlockchainNetwork.findMany({
      orderBy: [
        { currencyCode: 'asc' },
        { priority: 'asc' }
      ]
    });
    console.log(`✅ Found ${prodRecords.length} records in production\n`);

    // 2. Get existing local records
    const localRecords = await localDb.currencyBlockchainNetwork.findMany();
    console.log(`📊 Existing local records: ${localRecords.length}\n`);

    // 3. Check if currencies and blockchains exist locally
    const localCurrencies = await localDb.currency.findMany({
      select: { code: true }
    });
    const localBlockchains = await localDb.blockchainNetwork.findMany({
      select: { code: true }
    });

    const currencyCodes = new Set(localCurrencies.map(c => c.code));
    const blockchainCodes = new Set(localBlockchains.map(b => b.code));

    console.log('📋 Available local currencies:', Array.from(currencyCodes).join(', '));
    console.log('📋 Available local blockchains:', Array.from(blockchainCodes).join(', '));
    console.log('');

    // 4. Upsert each record
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const record of prodRecords) {
      // Check if currency and blockchain exist locally
      if (!currencyCodes.has(record.currencyCode)) {
        console.log(`⚠️  Skipping ${record.currencyCode}-${record.blockchainCode}: Currency not found locally`);
        skipped++;
        continue;
      }

      if (!blockchainCodes.has(record.blockchainCode)) {
        console.log(`⚠️  Skipping ${record.currencyCode}-${record.blockchainCode}: Blockchain not found locally`);
        skipped++;
        continue;
      }

      try {
        const result = await localDb.currencyBlockchainNetwork.upsert({
          where: {
            currencyCode_blockchainCode: {
              currencyCode: record.currencyCode,
              blockchainCode: record.blockchainCode
            }
          },
          create: {
            currencyCode: record.currencyCode,
            blockchainCode: record.blockchainCode,
            isActive: record.isActive,
            priority: record.priority,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
          },
          update: {
            isActive: record.isActive,
            priority: record.priority,
            updatedAt: new Date()
          }
        });

        const isNew = !localRecords.find(
          lr => lr.currencyCode === record.currencyCode && 
                lr.blockchainCode === record.blockchainCode
        );

        if (isNew) {
          console.log(`✅ Created: ${record.currencyCode} → ${record.blockchainCode} (priority: ${record.priority})`);
          created++;
        } else {
          console.log(`♻️  Updated: ${record.currencyCode} → ${record.blockchainCode} (priority: ${record.priority})`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${record.currencyCode}-${record.blockchainCode}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Sync Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${created}`);
    console.log(`♻️  Updated: ${updated}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`📦 Total processed: ${created + updated + skipped}`);
    console.log('='.repeat(60));

    // 5. Verify final state
    const finalRecords = await localDb.currencyBlockchainNetwork.findMany({
      include: {
        currency: { select: { name: true } },
        blockchain: { select: { name: true } }
      },
      orderBy: [
        { currencyCode: 'asc' },
        { priority: 'asc' }
      ]
    });

    console.log('\n🔍 Final state (local database):');
    console.log('='.repeat(60));
    finalRecords.forEach(record => {
      console.log(
        `${record.currencyCode.padEnd(6)} → ${record.blockchainCode.padEnd(15)} ` +
        `(priority: ${record.priority}, active: ${record.isActive})`
      );
    });
    console.log('='.repeat(60));

    console.log('\n✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  } finally {
    await prodDb.$disconnect();
    await localDb.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

