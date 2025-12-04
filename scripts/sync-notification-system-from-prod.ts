/**
 * Sync Notification System from Production
 * 
 * Синхронизирует:
 * - NotificationEventCategory
 * - NotificationEvent
 * 
 * БЕЗ потери локальных данных (upsert)
 * БЕЗ синхронизации NotificationQueue (это runtime данные)
 * 
 * Usage: 
 * PROD_DB_URL="postgresql://..." npx tsx scripts/sync-notification-system-from-prod.ts
 * 
 * Or use correct pooler URL:
 * postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
 */

import { PrismaClient } from '@prisma/client';

const PROD_DATABASE_URL = process.env.PROD_DB_URL || 
  'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DATABASE_URL,
    },
  },
});

const localPrisma = new PrismaClient();

async function syncNotificationSystem() {
  console.log('🔄 СИНХРОНИЗАЦИЯ СИСТЕМЫ УВЕДОМЛЕНИЙ\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Sync NotificationEventCategory
    console.log('\n📂 Синхронизация категорий событий...');
    const prodCategories = await prodPrisma.notificationEventCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    
    console.log(`   Найдено ${prodCategories.length} категорий в продакшене`);
    
    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    
    for (const category of prodCategories) {
      const existing = await localPrisma.notificationEventCategory.findUnique({
        where: { code: category.code },
      });
      
      if (existing) {
        // Update existing
        await localPrisma.notificationEventCategory.update({
          where: { code: category.code },
          data: {
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            isSystem: category.isSystem,
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            // НЕ обновляем: id, parentId (могут быть разные), createdAt, createdBy
          },
        });
        categoriesUpdated++;
      } else {
        // Create new
        await localPrisma.notificationEventCategory.create({
          data: {
            code: category.code,
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            isSystem: category.isSystem,
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            // НЕ копируем: id (автогенерация), parentId (может не совпадать)
          },
        });
        categoriesCreated++;
      }
    }
    
    console.log(`   ✅ Создано: ${categoriesCreated}`);
    console.log(`   ✅ Обновлено: ${categoriesUpdated}`);
    
    // 2. Build category mapping (prod code -> local id)
    console.log('\n🗺️  Создание маппинга категорий...');
    const localCategories = await localPrisma.notificationEventCategory.findMany();
    const categoryMap = new Map(localCategories.map(c => [c.code, c.id]));
    console.log(`   ✅ Маппинг создан для ${categoryMap.size} категорий`);
    
    // 3. Build template mapping (key -> local id)
    console.log('\n📧 Создание маппинга шаблонов...');
    const localTemplates = await localPrisma.emailTemplate.findMany();
    const templateMap = new Map(localTemplates.map(t => [t.key, t.id]));
    console.log(`   ✅ Маппинг создан для ${templateMap.size} шаблонов`);
    
    // 4. Sync NotificationEvent
    console.log('\n📬 Синхронизация событий...');
    const prodEvents = await prodPrisma.notificationEvent.findMany({
      include: {
        eventCategory: true,
        emailTemplate: true,
      },
      orderBy: { eventKey: 'asc' },
    });
    
    console.log(`   Найдено ${prodEvents.length} событий в продакшене`);
    
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsSkipped = 0;
    
    for (const event of prodEvents) {
      try {
        const existing = await localPrisma.notificationEvent.findUnique({
          where: { eventKey: event.eventKey },
        });
        
        // Map categoryId
        let localCategoryId: string | null = null;
        if (event.eventCategory) {
          localCategoryId = categoryMap.get(event.eventCategory.code) || null;
        }
        
        // Map templateId
        let localTemplateId: string | null = null;
        if (event.emailTemplate) {
          localTemplateId = templateMap.get(event.emailTemplate.key) || null;
        }
        
        const eventData = {
          name: event.name,
          description: event.description,
          category: event.category,
          channels: event.channels,
          priority: event.priority,
          isActive: event.isActive,
          isSystem: event.isSystem,
          templateKey: event.templateKey,
          categoryId: localCategoryId,
          templateId: localTemplateId,
          developerNotes: event.developerNotes,
          examplePayload: event.examplePayload,
          requiredVariables: event.requiredVariables,
          optionalVariables: event.optionalVariables,
          variableSchema: event.variableSchema,
          usageExamples: event.usageExamples,
        };
        
        if (existing) {
          // Update existing
          await localPrisma.notificationEvent.update({
            where: { eventKey: event.eventKey },
            data: eventData,
          });
          eventsUpdated++;
        } else {
          // Create new
          await localPrisma.notificationEvent.create({
            data: {
              eventKey: event.eventKey,
              ...eventData,
            },
          });
          eventsCreated++;
        }
      } catch (error) {
        console.error(`   ⚠️  Ошибка для события ${event.eventKey}:`, error instanceof Error ? error.message : error);
        eventsSkipped++;
      }
    }
    
    console.log(`   ✅ Создано: ${eventsCreated}`);
    console.log(`   ✅ Обновлено: ${eventsUpdated}`);
    if (eventsSkipped > 0) {
      console.log(`   ⚠️  Пропущено: ${eventsSkipped}`);
    }
    
    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА\n');
    console.log('📊 Итого:');
    console.log(`   Категории: ${categoriesCreated} создано, ${categoriesUpdated} обновлено`);
    console.log(`   События:   ${eventsCreated} создано, ${eventsUpdated} обновлено`);
    console.log('\n⚠️  NotificationQueue НЕ синхронизирован (это runtime данные)');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error);
    throw error;
  } finally {
    await prodPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

// Run
syncNotificationSystem()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });

