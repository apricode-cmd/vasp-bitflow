/**
 * Sync Currency isActive status from Production to Local
 * 
 * This script updates the isActive status of currencies in the local database
 * to match the production database without deleting any data.
 */

import { PrismaClient } from '@prisma/client';

const prodDb = new PrismaClient({
  datasourceUrl: 'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10'
});

const localDb = new PrismaClient();

async function main() {
  console.log('🔄 Syncing Currency isActive status from production...\n');

  try {
    // 1. Fetch currency statuses from production
    console.log('📥 Fetching currencies from production...');
    const prodCurrencies = await prodDb.currency.findMany({
      select: {
        code: true,
        isActive: true,
        priority: true
      },
      orderBy: { priority: 'asc' }
    });
    console.log(`✅ Found ${prodCurrencies.length} currencies in production\n`);

    // 2. Get local currencies
    const localCurrencies = await localDb.currency.findMany({
      select: {
        code: true,
        isActive: true,
        priority: true
      }
    });
    console.log(`📊 Found ${localCurrencies.length} currencies locally\n`);

    // 3. Show current status
    console.log('📋 Current Status Comparison:');
    console.log('='.repeat(70));
    console.log('CODE  | PROD Active | LOCAL Active | ACTION');
    console.log('='.repeat(70));

    const updates: Array<{ code: string; fromStatus: boolean; toStatus: boolean }> = [];

    for (const prodCurrency of prodCurrencies) {
      const localCurrency = localCurrencies.find(c => c.code === prodCurrency.code);
      
      if (!localCurrency) {
        console.log(`${prodCurrency.code.padEnd(6)}| ${prodCurrency.isActive ? '✓' : '✗'.padEnd(11)} | NOT FOUND    | ⚠️  Skip (not in local)`);
        continue;
      }

      const needsUpdate = localCurrency.isActive !== prodCurrency.isActive;
      const action = needsUpdate 
        ? `🔄 UPDATE (${localCurrency.isActive ? '✓' : '✗'} → ${prodCurrency.isActive ? '✓' : '✗'})`
        : '✓ OK (same)';

      console.log(
        `${prodCurrency.code.padEnd(6)}| ${(prodCurrency.isActive ? '✓' : '✗').padEnd(11)} | ${(localCurrency.isActive ? '✓' : '✗').padEnd(12)} | ${action}`
      );

      if (needsUpdate) {
        updates.push({
          code: prodCurrency.code,
          fromStatus: localCurrency.isActive,
          toStatus: prodCurrency.isActive
        });
      }
    }
    console.log('='.repeat(70));
    console.log('');

    if (updates.length === 0) {
      console.log('✅ All currencies are already in sync!');
      return;
    }

    // 4. Apply updates
    console.log(`📝 Applying ${updates.length} updates...\n`);

    for (const update of updates) {
      await localDb.currency.update({
        where: { code: update.code },
        data: {
          isActive: update.toStatus,
          updatedAt: new Date()
        }
      });

      const statusChange = update.toStatus 
        ? `${update.code}: ✗ DISABLED → ✓ ENABLED`
        : `${update.code}: ✓ ENABLED → ✗ DISABLED`;
      
      console.log(`  ${update.toStatus ? '✅' : '🔴'} ${statusChange}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Summary:');
    console.log('='.repeat(70));
    console.log(`✅ Updated: ${updates.length} currencies`);
    console.log('='.repeat(70));

    // 5. Verify final state
    const finalCurrencies = await localDb.currency.findMany({
      select: {
        code: true,
        name: true,
        isActive: true,
        priority: true
      },
      orderBy: { priority: 'asc' }
    });

    console.log('\n🔍 Final Local State:');
    console.log('='.repeat(70));
    finalCurrencies.forEach(currency => {
      const icon = currency.isActive ? '✅' : '🔴';
      const status = currency.isActive ? 'ACTIVE' : 'DISABLED';
      console.log(`${icon} ${currency.code.padEnd(6)} - ${currency.name.padEnd(15)} [${status}] (priority: ${currency.priority})`);
    });
    console.log('='.repeat(70));

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

