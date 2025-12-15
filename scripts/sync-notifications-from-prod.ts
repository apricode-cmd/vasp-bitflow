/**
 * Sync Notification data FROM Production TO Local
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
      url: 'postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&statement_cache_size=0',
    },
  },
});

async function main() {
  console.log('🔄 Синхронизация Notification данных из Production...\n');

  try {
    // 1. Sync Categories
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📁 Синхронизация Categories');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const prodCategories = await prodPrisma.notificationEventCategory.findMany();
    const localCategories = await localPrisma.notificationEventCategory.findMany();
    const localCategoryCodes = new Set(localCategories.map((c) => c.code));

    let addedCategories = 0;
    for (const category of prodCategories) {
      if (!localCategoryCodes.has(category.code)) {
        await localPrisma.notificationEventCategory.create({
          data: {
            id: category.id,
            code: category.code,
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          },
        });
        console.log(`  ✅ ${category.code} - ${category.name}`);
        addedCategories++;
      }
    }

    if (addedCategories === 0) {
      console.log('  ℹ️  Нет новых категорий\n');
    } else {
      console.log(`\n  📊 Добавлено: ${addedCategories} категорий\n`);
    }

    // 2. Sync Events
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 Синхронизация Events');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const prodEvents = await prodPrisma.notificationEvent.findMany();
    const localEvents = await localPrisma.notificationEvent.findMany();
    const localEventKeys = new Set(localEvents.map((e) => e.eventKey));

    // Get all local category IDs after sync
    const syncedLocalCategories = await localPrisma.notificationEventCategory.findMany();
    const localCategoryIds = new Set(syncedLocalCategories.map((c) => c.id));

    let addedEvents = 0;
    for (const event of prodEvents) {
      if (!localEventKeys.has(event.eventKey)) {
        // Check if categoryId exists in local, if not - set to null
        const categoryId = event.categoryId && localCategoryIds.has(event.categoryId) 
          ? event.categoryId 
          : null;

        // Set templateId to null (templates might not be synced yet)
        const templateId = null;

        await localPrisma.notificationEvent.create({
          data: {
            id: event.id,
            eventKey: event.eventKey,
            name: event.name,
            description: event.description,
            category: event.category,
            categoryId: categoryId,
            channels: event.channels || [],
            priority: event.priority,
            isActive: event.isActive,
            isSystem: event.isSystem,
            templateKey: event.templateKey,
            templateId: templateId,
            requiredVariables: event.requiredVariables || [],
            optionalVariables: event.optionalVariables || [],
            variableSchema: event.variableSchema,
            examplePayload: event.examplePayload,
            usageExamples: event.usageExamples,
            developerNotes: event.developerNotes,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          },
        });
        console.log(`  ✅ ${event.eventKey} - ${event.name}${!categoryId && event.categoryId ? ' (⚠️  categoryId set to null)' : ''}`);
        addedEvents++;
      }
    }

    if (addedEvents === 0) {
      console.log('  ℹ️  Нет новых событий\n');
    } else {
      console.log(`\n  📊 Добавлено: ${addedEvents} событий\n`);
    }

    // 3. Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  • Категорий добавлено: ${addedCategories}`);
    console.log(`  • Событий добавлено: ${addedEvents}`);
    console.log('');

  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
    throw error;
  } finally {
    await localPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

