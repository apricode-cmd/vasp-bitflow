/**
 * Sync TradingPair from Production to Local
 * 
 * This script syncs trading pairs from production database to local database.
 */

import { PrismaClient } from '@prisma/client';

const prodDb = new PrismaClient({
  datasourceUrl: 'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10'
});

const localDb = new PrismaClient();

async function main() {
  console.log('🔄 Syncing TradingPair from production...\n');

  try {
    // 1. Fetch from production
    console.log('📥 Fetching TradingPair from production...');
    const prodPairs = await prodDb.tradingPair.findMany({
      orderBy: { priority: 'asc' }
    });
    console.log(`✅ Found ${prodPairs.length} trading pairs in production\n`);

    // 2. Get existing local pairs
    const localPairs = await localDb.tradingPair.findMany();
    console.log(`📊 Existing local pairs: ${localPairs.length}\n`);

    // 3. Check if currencies exist locally
    const localCurrencies = await localDb.currency.findMany({
      select: { code: true }
    });
    const localFiatCurrencies = await localDb.fiatCurrency.findMany({
      select: { code: true }
    });

    const cryptoCodes = new Set(localCurrencies.map(c => c.code));
    const fiatCodes = new Set(localFiatCurrencies.map(f => f.code));

    console.log('📋 Available local crypto currencies:', Array.from(cryptoCodes).join(', '));
    console.log('📋 Available local fiat currencies:', Array.from(fiatCodes).join(', '));
    console.log('');

    // 4. Upsert each pair
    let created = 0;
    let updated = 0;
    let skipped = 0;

    console.log('Processing trading pairs:');
    console.log('='.repeat(80));

    for (const pair of prodPairs) {
      // Check if currencies exist locally
      if (!cryptoCodes.has(pair.cryptoCode)) {
        console.log(`⚠️  Skipping ${pair.cryptoCode}/${pair.fiatCode}: Crypto currency not found locally`);
        skipped++;
        continue;
      }

      if (!fiatCodes.has(pair.fiatCode)) {
        console.log(`⚠️  Skipping ${pair.cryptoCode}/${pair.fiatCode}: Fiat currency not found locally`);
        skipped++;
        continue;
      }

      try {
        const result = await localDb.tradingPair.upsert({
          where: {
            cryptoCode_fiatCode: {
              cryptoCode: pair.cryptoCode,
              fiatCode: pair.fiatCode
            }
          },
          create: {
            id: pair.id,
            cryptoCode: pair.cryptoCode,
            fiatCode: pair.fiatCode,
            isActive: pair.isActive,
            minCryptoAmount: pair.minCryptoAmount,
            maxCryptoAmount: pair.maxCryptoAmount,
            minFiatAmount: pair.minFiatAmount,
            maxFiatAmount: pair.maxFiatAmount,
            feePercent: pair.feePercent,
            priority: pair.priority,
            createdAt: pair.createdAt,
            updatedAt: pair.updatedAt
          },
          update: {
            isActive: pair.isActive,
            minCryptoAmount: pair.minCryptoAmount,
            maxCryptoAmount: pair.maxCryptoAmount,
            minFiatAmount: pair.minFiatAmount,
            maxFiatAmount: pair.maxFiatAmount,
            feePercent: pair.feePercent,
            priority: pair.priority,
            updatedAt: new Date()
          }
        });

        const isNew = !localPairs.find(
          lp => lp.cryptoCode === pair.cryptoCode && lp.fiatCode === pair.fiatCode
        );

        const statusIcon = pair.isActive ? '✅' : '🔴';
        const action = isNew ? '✅ Created' : '♻️  Updated';
        
        console.log(
          `${action}: ${statusIcon} ${pair.cryptoCode}/${pair.fiatCode} ` +
          `(${pair.minFiatAmount}-${pair.maxFiatAmount} ${pair.fiatCode}, ` +
          `fee: ${pair.feePercent}%, priority: ${pair.priority})`
        );

        if (isNew) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${pair.cryptoCode}/${pair.fiatCode}:`, error);
      }
    }

    console.log('='.repeat(80));
    console.log('\n📊 Sync Summary:');
    console.log('='.repeat(80));
    console.log(`✅ Created: ${created}`);
    console.log(`♻️  Updated: ${updated}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`📦 Total processed: ${created + updated + skipped}`);
    console.log('='.repeat(80));

    // 5. Verify final state
    const finalPairs = await localDb.tradingPair.findMany({
      orderBy: [
        { isActive: 'desc' },
        { priority: 'asc' }
      ]
    });

    console.log('\n🔍 Final state (local database):');
    console.log('='.repeat(80));
    console.log('Pair         | Active | Min Fiat | Max Fiat | Fee %  | Priority');
    console.log('='.repeat(80));
    finalPairs.forEach(pair => {
      const statusIcon = pair.isActive ? '✅' : '🔴';
      console.log(
        `${pair.cryptoCode}/${pair.fiatCode}`.padEnd(13) +
        `| ${statusIcon}     | ` +
        `${pair.minFiatAmount.toString().padEnd(8)} | ` +
        `${pair.maxFiatAmount.toString().padEnd(8)} | ` +
        `${pair.feePercent.toString().padEnd(6)} | ` +
        pair.priority
      );
    });
    console.log('='.repeat(80));

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

