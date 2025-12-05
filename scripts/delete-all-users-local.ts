/**
 * Delete All Users from Local Database
 * 
 * БЕЗОПАСНОСТЬ:
 * - Удаляет только User записи (НЕ Admin)
 * - Только локальная база (НЕ production)
 * - Cascade delete связанных данных
 * 
 * Usage:
 * npx tsx scripts/delete-all-users-local.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllUsers(): Promise<void> {
  console.log('\n🗑️  DELETE ALL USERS FROM LOCAL DATABASE');
  console.log('='.repeat(60));
  console.log('⚠️  Это удалит всех пользователей (НЕ админов)');
  console.log('⚠️  Связанные данные будут удалены cascade');
  console.log('='.repeat(60));
  console.log();

  try {
    // Check database URL to prevent production deletion
    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.includes('supabase.com') && databaseUrl.includes('rltqjdujiacriilmijpz')) {
      console.error('❌ ОШИБКА: Это production база!');
      console.error('❌ Удаление пользователей из production запрещено!');
      process.exit(1);
    }

    console.log('🔗 Подключение к локальной базе...');
    await prisma.$connect();
    console.log('✅ Подключено\n');

    // Count users before deletion
    const userCountBefore = await prisma.user.count();
    console.log(`📊 Пользователей в базе: ${userCountBefore}`);

    if (userCountBefore === 0) {
      console.log('\n✅ База уже пустая (нет пользователей)');
      return;
    }

    console.log('\n🗑️  Удаление связанных данных...\n');

    // Delete in correct order to respect foreign keys

    // 1. Virtual IBAN related
    console.log('🏦 Virtual IBAN...');
    const deletedTopUpRequests = await prisma.topUpRequest.deleteMany();
    console.log(`  ✓ TopUpRequest: ${deletedTopUpRequests.count}`);

    const deletedVirtualIbanTransactions = await prisma.virtualIbanTransaction.deleteMany();
    console.log(`  ✓ VirtualIbanTransaction: ${deletedVirtualIbanTransactions.count}`);

    const deletedVirtualIbanAuditLogs = await prisma.virtualIbanAuditLog.deleteMany();
    console.log(`  ✓ VirtualIbanAuditLog: ${deletedVirtualIbanAuditLogs.count}`);

    const deletedVirtualIbanAccounts = await prisma.virtualIbanAccount.deleteMany();
    console.log(`  ✓ VirtualIbanAccount: ${deletedVirtualIbanAccounts.count}`);

    // 2. Orders & Transactions
    console.log('\n📦 Orders & Transactions...');
    const deletedPayOuts = await prisma.payOut.deleteMany();
    console.log(`  ✓ PayOut: ${deletedPayOuts.count}`);

    const deletedPayIns = await prisma.payIn.deleteMany();
    console.log(`  ✓ PayIn: ${deletedPayIns.count}`);

    const deletedOrders = await prisma.order.deleteMany();
    console.log(`  ✓ Order: ${deletedOrders.count}`);

    // 3. KYC
    console.log('\n🛡️  KYC...');
    const deletedKycDocuments = await prisma.kycDocument.deleteMany();
    console.log(`  ✓ KycDocument: ${deletedKycDocuments.count}`);

    const deletedKycSessions = await prisma.kycSession.deleteMany();
    console.log(`  ✓ KycSession: ${deletedKycSessions.count}`);

    // 4. User Wallets
    console.log('\n💼 User Wallets...');
    const deletedUserWallets = await prisma.userWallet.deleteMany();
    console.log(`  ✓ UserWallet: ${deletedUserWallets.count}`);

    // 5. Notifications
    console.log('\n📬 Notifications...');
    const deletedNotificationQueue = await prisma.notificationQueue.deleteMany({
      where: { userId: { not: null } },
    });
    console.log(`  ✓ NotificationQueue: ${deletedNotificationQueue.count}`);

    const deletedNotificationSubscriptions = await prisma.notificationSubscription.deleteMany();
    console.log(`  ✓ NotificationSubscription: ${deletedNotificationSubscriptions.count}`);

    // 6. Finally, delete Users
    console.log('\n👥 Users...');
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`  ✓ User: ${deletedUsers.count}`);

    // Verify
    const userCountAfter = await prisma.user.count();
    console.log();
    console.log('='.repeat(60));
    console.log('✅ DELETION COMPLETED');
    console.log('='.repeat(60));
    console.log();
    console.log(`📊 Пользователей до: ${userCountBefore}`);
    console.log(`📊 Пользователей после: ${userCountAfter}`);
    console.log();
    console.log('⚠️  Admin записи НЕ тронуты');
    console.log();

  } catch (error) {
    console.error('\n❌ Deletion error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('✅ Disconnected from database\n');
  }
}

// Run deletion
deleteAllUsers()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

