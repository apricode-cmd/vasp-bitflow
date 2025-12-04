/**
 * Seed Notification System Only
 * 
 * Заполняет только таблицы уведомлений:
 * - NotificationEventCategory
 * - NotificationEvent
 * 
 * БЕЗ потери существующих данных (upsert)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedNotificationSystem() {
  console.log('📬 ЗАПОЛНЕНИЕ СИСТЕМЫ УВЕДОМЛЕНИЙ\n');
  console.log('='.repeat(60));

  try {
    // 1. Notification Event Categories
    console.log('\n📂 Создание категорий событий...');
    
    const eventCategories = [
      {
        code: 'ORDER',
        name: 'Order Management',
        description: 'Events related to order lifecycle',
        icon: 'ShoppingCart',
        color: '#3B82F6', // blue-500
        isSystem: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        code: 'KYC',
        name: 'KYC & Compliance',
        description: 'Events related to KYC and user verification',
        icon: 'Shield',
        color: '#10B981', // green-500
        isSystem: false,
        isActive: true,
        sortOrder: 2,
      },
      {
        code: 'PAYMENT',
        name: 'Payment Processing',
        description: 'Events related to payments and transactions',
        icon: 'CreditCard',
        color: '#8B5CF6', // violet-500
        isSystem: false,
        isActive: true,
        sortOrder: 3,
      },
      {
        code: 'SECURITY',
        name: 'Security & Auth',
        description: 'Events related to security and authentication',
        icon: 'Lock',
        color: '#EF4444', // red-500
        isSystem: true,
        isActive: true,
        sortOrder: 4,
      },
      {
        code: 'SYSTEM',
        name: 'System Events',
        description: 'Internal system events and maintenance',
        icon: 'Settings',
        color: '#6B7280', // gray-500
        isSystem: true,
        isActive: true,
        sortOrder: 5,
      },
      {
        code: 'ADMIN',
        name: 'Admin Actions',
        description: 'Events related to admin panel actions',
        icon: 'UserCog',
        color: '#F59E0B', // amber-500
        isSystem: true,
        isActive: true,
        sortOrder: 6,
      },
      {
        code: 'MARKETING',
        name: 'Marketing & Promo',
        description: 'Events related to marketing campaigns',
        icon: 'Megaphone',
        color: '#EC4899', // pink-500
        isSystem: true,
        isActive: true,
        sortOrder: 7,
      },
    ];

    const categoryMap: Record<string, string> = {};
    for (const category of eventCategories) {
      const created = await prisma.notificationEventCategory.upsert({
        where: { code: category.code },
        update: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          isSystem: category.isSystem,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
        },
        create: category,
      });
      categoryMap[category.code] = created.id;
      console.log(`  ✓ ${category.name}`);
    }
    console.log(`\n  ✅ ${eventCategories.length} категорий обработано`);

    // 2. Notification Events
    console.log('\n📬 Создание событий уведомлений...');
    
    const notificationEvents = [
      // ORDER EVENTS
      {
        eventKey: 'order.created',
        name: 'Order Created',
        description: 'Triggered when a new order is created',
        category: 'ORDER',
        categoryId: categoryMap['ORDER'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: false,
        templateKey: 'order_created',
        requiredVariables: ['orderNumber', 'cryptoAmount', 'cryptoCurrency', 'fiatAmount', 'fiatCurrency'],
        optionalVariables: ['paymentInstructions', 'expiresAt'],
      },
      {
        eventKey: 'order.payment_received',
        name: 'Payment Received',
        description: 'Triggered when payment is received for an order',
        category: 'ORDER',
        categoryId: categoryMap['ORDER'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'payment_received',
        requiredVariables: ['orderNumber', 'receivedAmount', 'currency'],
        optionalVariables: ['paymentMethod', 'transactionId'],
      },
      {
        eventKey: 'order.completed',
        name: 'Order Completed',
        description: 'Triggered when an order is completed and crypto is sent',
        category: 'ORDER',
        categoryId: categoryMap['ORDER'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'order_completed',
        requiredVariables: ['orderNumber', 'cryptoAmount', 'cryptoCurrency', 'walletAddress', 'txHash'],
        optionalVariables: ['networkFee', 'explorerUrl'],
      },
      {
        eventKey: 'order.cancelled',
        name: 'Order Cancelled',
        description: 'Triggered when an order is cancelled',
        category: 'ORDER',
        categoryId: categoryMap['ORDER'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: false,
        templateKey: 'order_cancelled',
        requiredVariables: ['orderNumber', 'reason'],
        optionalVariables: ['refundAmount', 'refundMethod'],
      },
      
      // KYC EVENTS
      {
        eventKey: 'kyc.submitted',
        name: 'KYC Submitted',
        description: 'Triggered when user submits KYC documents',
        category: 'KYC',
        categoryId: categoryMap['KYC'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: false,
        templateKey: 'kyc_submitted',
        requiredVariables: ['userName'],
        optionalVariables: ['estimatedReviewTime'],
      },
      {
        eventKey: 'kyc.approved',
        name: 'KYC Approved',
        description: 'Triggered when KYC is approved',
        category: 'KYC',
        categoryId: categoryMap['KYC'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'kyc_approved',
        requiredVariables: ['userName'],
        optionalVariables: ['nextSteps'],
      },
      {
        eventKey: 'kyc.rejected',
        name: 'KYC Rejected',
        description: 'Triggered when KYC is rejected',
        category: 'KYC',
        categoryId: categoryMap['KYC'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'kyc_rejected',
        requiredVariables: ['userName', 'reason'],
        optionalVariables: ['resubmitUrl'],
      },
      
      // PAYMENT EVENTS
      {
        eventKey: 'payment.pending',
        name: 'Payment Pending',
        description: 'Triggered when awaiting payment confirmation',
        category: 'PAYMENT',
        categoryId: categoryMap['PAYMENT'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: false,
        templateKey: 'payment_pending',
        requiredVariables: ['amount', 'currency', 'paymentReference'],
        optionalVariables: ['bankDetails', 'expiresAt'],
      },
      {
        eventKey: 'payment.confirmed',
        name: 'Payment Confirmed',
        description: 'Triggered when payment is confirmed',
        category: 'PAYMENT',
        categoryId: categoryMap['PAYMENT'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'payment_confirmed',
        requiredVariables: ['amount', 'currency', 'transactionId'],
        optionalVariables: ['paymentDate'],
      },
      
      // SECURITY EVENTS
      {
        eventKey: 'security.login',
        name: 'Login Notification',
        description: 'Triggered on successful login',
        category: 'SECURITY',
        categoryId: categoryMap['SECURITY'],
        channels: ['EMAIL'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: true,
        templateKey: 'login_notification',
        requiredVariables: ['ipAddress', 'userAgent'],
        optionalVariables: ['location', 'device'],
      },
      {
        eventKey: 'security.password_changed',
        name: 'Password Changed',
        description: 'Triggered when password is changed',
        category: 'SECURITY',
        categoryId: categoryMap['SECURITY'],
        channels: ['EMAIL'],
        priority: 'HIGH',
        isActive: true,
        isSystem: true,
        templateKey: 'password_changed',
        requiredVariables: ['userName'],
        optionalVariables: ['changedAt'],
      },
      
      // SYSTEM EVENTS
      {
        eventKey: 'system.maintenance',
        name: 'Maintenance Notification',
        description: 'Triggered before scheduled maintenance',
        category: 'SYSTEM',
        categoryId: categoryMap['SYSTEM'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: true,
        templateKey: 'maintenance_notification',
        requiredVariables: ['startTime', 'duration'],
        optionalVariables: ['reason', 'affectedServices'],
      },
      
      // VIRTUAL IBAN EVENTS
      {
        eventKey: 'virtual_iban.created',
        name: 'Virtual IBAN Created',
        description: 'Triggered when Virtual IBAN account is created',
        category: 'PAYMENT',
        categoryId: categoryMap['PAYMENT'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'virtual_iban_created',
        requiredVariables: ['iban', 'bic', 'currency', 'accountHolder'],
        optionalVariables: ['bankName', 'bankCountry'],
      },
      {
        eventKey: 'virtual_iban.topup_completed',
        name: 'Virtual IBAN Top-Up Completed',
        description: 'Triggered when Virtual IBAN top-up is completed',
        category: 'PAYMENT',
        categoryId: categoryMap['PAYMENT'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'HIGH',
        isActive: true,
        isSystem: false,
        templateKey: 'virtual_iban_topup_completed',
        requiredVariables: ['amount', 'currency', 'newBalance', 'iban'],
        optionalVariables: ['reference', 'transactionId'],
      },
      {
        eventKey: 'virtual_iban.closed',
        name: 'Virtual IBAN Closed',
        description: 'Triggered when Virtual IBAN account is closed',
        category: 'PAYMENT',
        categoryId: categoryMap['PAYMENT'],
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        isActive: true,
        isSystem: false,
        templateKey: 'virtual_iban_closed',
        requiredVariables: ['iban', 'reason'],
        optionalVariables: ['closedBy', 'finalBalance'],
      },
    ];

    let eventsCreated = 0;
    let eventsUpdated = 0;

    for (const event of notificationEvents) {
      const existing = await prisma.notificationEvent.findUnique({
        where: { eventKey: event.eventKey },
      });

      if (existing) {
        await prisma.notificationEvent.update({
          where: { eventKey: event.eventKey },
          data: event,
        });
        eventsUpdated++;
      } else {
        await prisma.notificationEvent.create({
          data: event,
        });
        eventsCreated++;
      }
      console.log(`  ✓ ${event.name} (${event.eventKey})`);
    }

    console.log(`\n  ✅ Создано: ${eventsCreated}`);
    console.log(`  ✅ Обновлено: ${eventsUpdated}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ СИСТЕМА УВЕДОМЛЕНИЙ ГОТОВА\n');
    console.log('📊 Итого:');
    console.log(`   Категории: ${eventCategories.length}`);
    console.log(`   События:   ${notificationEvents.length}`);
    console.log('\n✅ Все данные сохранены без потерь!');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedNotificationSystem()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });

