/**
 * Fix categoryId for NotificationEvents based on category enum
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Исправление categoryId для Notification Events...\n');

  // Get all categories
  const categories = await prisma.notificationEventCategory.findMany();
  
  // Create mapping: category enum -> categoryId
  const categoryMap: Record<string, string> = {};
  
  // Map based on typical category codes
  const categoryCodeMap: Record<string, string> = {
    'SYSTEM': 'SYSTEM',
    'KYC': 'KYC',
    'ORDER': 'ORDER',
    'PAYMENT': 'PAYMENT',
    'SECURITY': 'SECURITY',
    'ADMIN_MANAGEMENT': 'ADMIN_MANAGEMENT',
    'TRANSACTION': 'TRANSACTION',
    'VIRTUAL_IBAN': 'VIRTUAL_IBAN',
  };

  // Build the map
  for (const cat of categories) {
    const enumValue = categoryCodeMap[cat.code];
    if (enumValue) {
      categoryMap[enumValue] = cat.id;
    }
  }

  console.log('📋 Найденные категории:');
  for (const [enumValue, id] of Object.entries(categoryMap)) {
    const cat = categories.find(c => c.id === id);
    console.log(`  • ${enumValue} → ${cat?.name} (${id})`);
  }
  console.log('');

  // Get events with null categoryId
  const eventsWithoutCategory = await prisma.notificationEvent.findMany({
    where: {
      categoryId: null,
    },
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 Обновление ${eventsWithoutCategory.length} событий\n`);

  let updated = 0;
  for (const event of eventsWithoutCategory) {
    const newCategoryId = categoryMap[event.category];
    
    if (newCategoryId) {
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { categoryId: newCategoryId },
      });
      console.log(`  ✅ ${event.eventKey} → ${event.category}`);
      updated++;
    } else {
      console.log(`  ⚠️  ${event.eventKey} → ${event.category} (category not found)`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ЗАВЕРШЕНО');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  • Обновлено: ${updated} событий`);
  console.log('');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});

