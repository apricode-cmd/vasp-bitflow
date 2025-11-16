/**
 * Update Currency Icons Script
 * Updates iconUrl for all currencies in the database
 * 
 * Usage:
 *   npx tsx scripts/update-currency-icons.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURRENCY_ICONS = [
  { code: 'BTC', icon: '/uploads/currencies/BTC.svg' },
  { code: 'ETH', icon: '/uploads/currencies/ETH.svg' },
  { code: 'USDT', icon: '/uploads/currencies/USDT.svg' },
  { code: 'SOL', icon: '/uploads/currencies/SOL.svg' },
  { code: 'USDC', icon: '/uploads/currencies/USDC.svg' },
  { code: 'BNB', icon: '/uploads/currencies/BNB.svg' },
  { code: 'XRP', icon: '/uploads/currencies/XRP.svg' },
  { code: 'ADA', icon: '/uploads/currencies/ADA.svg' },
  { code: 'DOGE', icon: '/uploads/currencies/DOGE.svg' },
  { code: 'TRX', icon: '/uploads/currencies/TRX.svg' },
];

async function updateCurrencyIcons() {
  console.log('🚀 Starting currency icons update...\n');

  let updated = 0;
  let notFound = 0;

  for (const { code, icon } of CURRENCY_ICONS) {
    try {
      const currency = await prisma.currency.findUnique({
        where: { code }
      });

      if (!currency) {
        console.log(`⏭️  ${code} - Currency not found in database`);
        notFound++;
        continue;
      }

      await prisma.currency.update({
        where: { code },
        data: { iconUrl: icon }
      });

      console.log(`✅ ${code} - Updated iconUrl: ${icon}`);
      updated++;
    } catch (error) {
      console.error(`❌ ${code} - Error:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Not Found: ${notFound}`);
  console.log(`  📦 Total: ${CURRENCY_ICONS.length}`);
}

updateCurrencyIcons()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

