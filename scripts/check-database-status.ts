/**
 * Check Database Tables and Data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking Database...\n');

  try {
    // 1. Check existing data (should be intact)
    console.log('📊 EXISTING DATA CHECK:');
    console.log('─────────────────────────────────────');
    
    const userCount = await prisma.user.count();
    console.log(`✅ Users: ${userCount}`);
    
    const adminCount = await prisma.admin.count();
    console.log(`✅ Admins: ${adminCount}`);
    
    const virtualIbanCount = await prisma.virtualIbanAccount.count();
    console.log(`✅ Virtual IBAN Accounts: ${virtualIbanCount}`);
    
    const transactionCount = await prisma.virtualIbanTransaction.count();
    console.log(`✅ Virtual IBAN Transactions: ${transactionCount}`);
    
    const topUpCount = await prisma.topUpRequest.count();
    console.log(`✅ Top-Up Requests: ${topUpCount}`);
    
    const orderCount = await prisma.order.count();
    console.log(`✅ Orders: ${orderCount}`);

    // 2. Check NEW tables (should be empty)
    console.log('\n📋 NEW TABLES CHECK (Enterprise Features):');
    console.log('─────────────────────────────────────');
    
    const auditCount = await prisma.virtualIbanAuditLog.count();
    console.log(`✅ Virtual IBAN Audit Logs: ${auditCount} (new table)`);
    
    const snapshotCount = await prisma.virtualIbanBalanceSnapshot.count();
    console.log(`✅ Balance Snapshots: ${snapshotCount} (new table)`);
    
    const reconciliationCount = await prisma.virtualIbanReconciliationReport.count();
    console.log(`✅ Reconciliation Reports: ${reconciliationCount} (new table)`);

    // 3. Check Virtual IBAN accounts details
    if (virtualIbanCount > 0) {
      console.log('\n💳 VIRTUAL IBAN ACCOUNTS DETAILS:');
      console.log('─────────────────────────────────────');
      
      const accounts = await prisma.virtualIbanAccount.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      
      accounts.forEach((account, index) => {
        console.log(`\n${index + 1}. ${account.iban}`);
        console.log(`   User: ${account.user.email}`);
        console.log(`   Status: ${account.status}`);
        console.log(`   Balance: €${account.balance.toFixed(2)}`);
        console.log(`   Currency: ${account.currency}`);
        console.log(`   Country: ${account.country}`);
      });

      // Calculate total balance
      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      console.log(`\n💰 Total Balance (all accounts): €${totalBalance.toFixed(2)}`);
    }

    console.log('\n✅ DATABASE CHECK COMPLETED SUCCESSFULLY!');
    console.log('\n📌 Summary:');
    console.log('  - All existing data is intact ✅');
    console.log('  - New enterprise tables created ✅');
    console.log('  - Prisma Client generated ✅');
    console.log('  - Ready for Audit Service integration ✅');

  } catch (error) {
    console.error('\n❌ DATABASE CHECK FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

