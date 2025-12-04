/**
 * Backup Notification System Tables
 * 
 * Creates JSON backup of:
 * - NotificationEventCategory
 * - NotificationEvent
 * - NotificationQueue
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';

const prisma = new PrismaClient();

async function backupNotificationSystem() {
  console.log('💾 СОЗДАНИЕ БЭКАПА СИСТЕМЫ УВЕДОМЛЕНИЙ\n');
  
  try {
    // Create backups directory
    mkdirSync('backups/notifications', { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backups/notifications/backup_${timestamp}.json`;
    
    console.log('📂 Загрузка данных...');
    
    const [categories, events, queue] = await Promise.all([
      prisma.notificationEventCategory.findMany(),
      prisma.notificationEvent.findMany(),
      prisma.notificationQueue.findMany(),
    ]);
    
    const backup = {
      timestamp: new Date().toISOString(),
      tables: {
        NotificationEventCategory: {
          count: categories.length,
          data: categories,
        },
        NotificationEvent: {
          count: events.length,
          data: events,
        },
        NotificationQueue: {
          count: queue.length,
          data: queue,
        },
      },
    };
    
    console.log(`   ✅ NotificationEventCategory: ${categories.length} записей`);
    console.log(`   ✅ NotificationEvent: ${events.length} записей`);
    console.log(`   ✅ NotificationQueue: ${queue.length} записей`);
    
    writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Бэкап создан: ${filename}`);
    console.log(`   Размер: ${(Buffer.byteLength(JSON.stringify(backup)) / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupNotificationSystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

