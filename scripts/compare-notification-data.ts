/**
 * Compare Notification data between Production and Local databases
 */

import { PrismaClient } from '@prisma/client';

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PROD_DATABASE_URL || 'postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&statement_cache_size=0',
    },
  },
});

async function main() {
  console.log('🔍 Сравнение Notification данных...\n');

  // 1. Categories
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📁 NOTIFICATION EVENT CATEGORIES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const [prodCategories, localCategories] = await Promise.all([
    prodPrisma.notificationEventCategory.findMany({ orderBy: { code: 'asc' } }),
    localPrisma.notificationEventCategory.findMany({ orderBy: { code: 'asc' } }),
  ]);

  console.log(`Production: ${prodCategories.length} категорий`);
  console.log(`Local:      ${localCategories.length} категорий\n`);

  const localCategoryCodes = new Set(localCategories.map((c) => c.code));
  const missingCategories = prodCategories.filter((c) => !localCategoryCodes.has(c.code));

  if (missingCategories.length > 0) {
    console.log(`❌ Отсутствуют в Local (${missingCategories.length}):\n`);
    missingCategories.forEach((cat) => {
      console.log(`  • ${cat.code} - ${cat.name}`);
    });
    console.log('');
  } else {
    console.log('✅ Все категории есть в Local\n');
  }

  // 2. Events
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔔 NOTIFICATION EVENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const [prodEvents, localEvents] = await Promise.all([
    prodPrisma.notificationEvent.findMany({ orderBy: { eventKey: 'asc' } }),
    localPrisma.notificationEvent.findMany({ orderBy: { eventKey: 'asc' } }),
  ]);

  console.log(`Production: ${prodEvents.length} событий`);
  console.log(`Local:      ${localEvents.length} событий\n`);

  const localEventKeys = new Set(localEvents.map((e) => e.eventKey));
  const missingEvents = prodEvents.filter((e) => !localEventKeys.has(e.eventKey));

  if (missingEvents.length > 0) {
    console.log(`❌ Отсутствуют в Local (${missingEvents.length}):\n`);
    missingEvents.forEach((evt) => {
      console.log(`  • ${evt.eventKey} - ${evt.name} (${evt.category})`);
    });
    console.log('');
  } else {
    console.log('✅ Все события есть в Local\n');
  }

  // 3. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (missingCategories.length === 0 && missingEvents.length === 0) {
    console.log('🎉 Все данные синхронизированы!');
  } else {
    console.log(`⚠️  Нужно добавить:`);
    console.log(`   • ${missingCategories.length} категорий`);
    console.log(`   • ${missingEvents.length} событий`);
    console.log('');
    console.log('💡 Запустите: npm run sync:notifications');
  }

  await localPrisma.$disconnect();
  await prodPrisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});

