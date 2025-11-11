/**
 * Fix Notification System
 * 
 * Links NotificationEvents to:
 * 1. NotificationEventCategory (categoryId)
 * 2. EmailTemplate (templateId)
 * 
 * Run: npx tsx prisma/fix-notification-system.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNotificationSystem() {
  console.log('🔧 ИСПРАВЛЕНИЕ СИСТЕМЫ УВЕДОМЛЕНИЙ\n');
  console.log('='.repeat(60));

  // 1. Get all categories
  console.log('\n📂 Загрузка категорий...');
  const categories = await prisma.notificationEventCategory.findMany();
  const categoryMap = new Map(categories.map(c => [c.code, c.id]));
  console.log(`   ✅ Загружено ${categories.length} категорий`);

  // 2. Get all templates
  console.log('\n📧 Загрузка email шаблонов...');
  const templates = await prisma.emailTemplate.findMany({
    where: { status: 'PUBLISHED', isActive: true }
  });
  const templateMap = new Map(templates.map(t => [t.key, t.id]));
  console.log(`   ✅ Загружено ${templates.length} шаблонов`);

  // 3. Get all events
  console.log('\n📬 Загрузка событий...');
  const events = await prisma.notificationEvent.findMany();
  console.log(`   ✅ Загружено ${events.length} событий`);

  // 4. Link events to categories and templates
  console.log('\n🔗 Связывание событий...\n');
  
  let linkedCategories = 0;
  let linkedTemplates = 0;
  let errors = 0;

  for (const event of events) {
    try {
      const updates: any = {};
      let needsUpdate = false;

      // Link to category
      if (!event.categoryId) {
        const categoryId = categoryMap.get(event.category);
        if (categoryId) {
          updates.categoryId = categoryId;
          needsUpdate = true;
          linkedCategories++;
        } else {
          console.log(`   ⚠️  Category not found for ${event.eventKey}: ${event.category}`);
        }
      }

      // Link to template (if EMAIL channel is enabled)
      if (!event.templateId && event.channels.includes('EMAIL')) {
        const templateId = templateMap.get(event.eventKey);
        if (templateId) {
          updates.templateId = templateId;
          needsUpdate = true;
          linkedTemplates++;
        } else {
          // Try alternative template keys
          const altKeys = [
            event.eventKey.replace('ORDER_PAYMENT_RECEIVED', 'PAYMENT_RECEIVED'),
          ];
          
          for (const altKey of altKeys) {
            const altTemplateId = templateMap.get(altKey);
            if (altTemplateId) {
              updates.templateId = altTemplateId;
              needsUpdate = true;
              linkedTemplates++;
              break;
            }
          }
        }
      }

      // Update event if needed
      if (needsUpdate) {
        await prisma.notificationEvent.update({
          where: { id: event.id },
          data: updates
        });
        
        const catStatus = updates.categoryId ? '✅ Cat' : '';
        const tmpStatus = updates.templateId ? '✅ Tmpl' : '';
        console.log(`   ${event.eventKey.padEnd(30)} ${catStatus} ${tmpStatus}`);
      }
    } catch (error) {
      console.error(`   ❌ Error updating ${event.eventKey}:`, error);
      errors++;
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 ИТОГИ:');
  console.log(`   ✅ Связано с категориями: ${linkedCategories}`);
  console.log(`   ✅ Связано с шаблонами: ${linkedTemplates}`);
  if (errors > 0) {
    console.log(`   ❌ Ошибок: ${errors}`);
  }

  // 6. Verify
  console.log('\n🔍 ПРОВЕРКА:');
  const eventsWithoutCategory = await prisma.notificationEvent.count({
    where: { categoryId: null }
  });
  const eventsWithoutTemplate = await prisma.notificationEvent.count({
    where: { 
      templateId: null,
      channels: { has: 'EMAIL' }
    }
  });

  console.log(`   События без категории: ${eventsWithoutCategory}`);
  console.log(`   EMAIL события без шаблона: ${eventsWithoutTemplate}`);

  if (eventsWithoutCategory === 0 && eventsWithoutTemplate === 0) {
    console.log('\n✅ ВСЕ СОБЫТИЯ ПРАВИЛЬНО СВЯЗАНЫ!');
  } else {
    console.log('\n⚠️  Остались несвязанные события (возможно, нет соответствующих шаблонов)');
  }

  console.log('\n' + '='.repeat(60));
  
  await prisma.$disconnect();
}

fixNotificationSystem().catch(console.error);

