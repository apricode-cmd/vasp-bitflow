/**
 * Production Database Backup Script
 * 
 * БЕЗОПАСНОСТЬ:
 * - ТОЛЬКО чтение (READ ONLY)
 * - НЕ изменяет production базу
 * - Сохраняет в JSON файл
 * 
 * Usage:
 * DATABASE_URL_PROD="postgres://..." npx tsx scripts/backup-prod-database.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const PROD_DATABASE_URL = process.env.DATABASE_URL_PROD || 
  'postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&statement_cache_size=0';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DATABASE_URL,
    },
  },
});

interface BackupData {
  timestamp: string;
  database: string;
  tables: {
    [key: string]: any[];
  };
  counts: {
    [key: string]: number;
  };
}

async function backupProductionDatabase(): Promise<void> {
  console.log('\n📦 PRODUCTION DATABASE BACKUP');
  console.log('='.repeat(60));
  console.log('⚠️  READ ONLY - Никаких изменений в production');
  console.log('='.repeat(60));
  console.log();

  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    database: 'production',
    tables: {},
    counts: {},
  };

  try {
    console.log('🔗 Подключение к production базе...');
    await prisma.$connect();
    console.log('✅ Подключено\n');

    // ==========================================
    // USERS & AUTH
    // ==========================================
    console.log('👥 Users & Auth...');
    
    // Fetch only base User data without includes to avoid schema mismatches
    backup.tables.User = await prisma.user.findMany();
    backup.counts.User = backup.tables.User.length;
    console.log(`  ✓ User: ${backup.counts.User}`);

    backup.tables.Admin = await prisma.admin.findMany();
    backup.counts.Admin = backup.tables.Admin.length;
    console.log(`  ✓ Admin: ${backup.counts.Admin}`);
    
    // User Profile
    try {
      backup.tables.UserProfile = await prisma.userProfile.findMany();
      backup.counts.UserProfile = backup.tables.UserProfile.length;
      console.log(`  ✓ UserProfile: ${backup.counts.UserProfile}`);
    } catch (e) {
      console.log(`  ⚠️  UserProfile: не существует`);
    }

    // ==========================================
    // CURRENCIES & TRADING
    // ==========================================
    console.log('\n💱 Currencies & Trading...');
    
    backup.tables.Currency = await prisma.currency.findMany();
    backup.counts.Currency = backup.tables.Currency.length;
    console.log(`  ✓ Currency: ${backup.counts.Currency}`);

    backup.tables.BlockchainNetwork = await prisma.blockchainNetwork.findMany();
    backup.counts.BlockchainNetwork = backup.tables.BlockchainNetwork.length;
    console.log(`  ✓ BlockchainNetwork: ${backup.counts.BlockchainNetwork}`);

    backup.tables.CurrencyBlockchainNetwork = await prisma.currencyBlockchainNetwork.findMany();
    backup.counts.CurrencyBlockchainNetwork = backup.tables.CurrencyBlockchainNetwork.length;
    console.log(`  ✓ CurrencyBlockchainNetwork: ${backup.counts.CurrencyBlockchainNetwork}`);

    backup.tables.TradingPair = await prisma.tradingPair.findMany();
    backup.counts.TradingPair = backup.tables.TradingPair.length;
    console.log(`  ✓ TradingPair: ${backup.counts.TradingPair}`);

    // ==========================================
    // PAYMENT METHODS
    // ==========================================
    console.log('\n💳 Payment Methods...');
    
    backup.tables.PaymentMethod = await prisma.paymentMethod.findMany();
    backup.counts.PaymentMethod = backup.tables.PaymentMethod.length;
    console.log(`  ✓ PaymentMethod: ${backup.counts.PaymentMethod}`);

    backup.tables.PaymentAccount = await prisma.paymentAccount.findMany();
    backup.counts.PaymentAccount = backup.tables.PaymentAccount.length;
    console.log(`  ✓ PaymentAccount: ${backup.counts.PaymentAccount}`);

    backup.tables.BankAccount = await prisma.bankAccount.findMany();
    backup.counts.BankAccount = backup.tables.BankAccount.length;
    console.log(`  ✓ BankAccount: ${backup.counts.BankAccount}`);

    backup.tables.CryptoWallet = await prisma.cryptoWallet.findMany();
    backup.counts.CryptoWallet = backup.tables.CryptoWallet.length;
    console.log(`  ✓ CryptoWallet: ${backup.counts.CryptoWallet}`);

    // ==========================================
    // ORDERS & TRANSACTIONS
    // ==========================================
    console.log('\n📦 Orders & Transactions...');
    
    backup.tables.Order = await prisma.order.findMany({
      include: {
        payIn: true,
        payOut: true,
      },
    });
    backup.counts.Order = backup.tables.Order.length;
    console.log(`  ✓ Order: ${backup.counts.Order}`);

    backup.tables.PayIn = await prisma.payIn.findMany();
    backup.counts.PayIn = backup.tables.PayIn.length;
    console.log(`  ✓ PayIn: ${backup.counts.PayIn}`);

    backup.tables.PayOut = await prisma.payOut.findMany();
    backup.counts.PayOut = backup.tables.PayOut.length;
    console.log(`  ✓ PayOut: ${backup.counts.PayOut}`);

    // ==========================================
    // KYC
    // ==========================================
    console.log('\n🛡️  KYC...');
    
    backup.tables.KycFormField = await prisma.kycFormField.findMany();
    backup.counts.KycFormField = backup.tables.KycFormField.length;
    console.log(`  ✓ KycFormField: ${backup.counts.KycFormField}`);

    // ==========================================
    // VIRTUAL IBAN
    // ==========================================
    console.log('\n🏦 Virtual IBAN...');
    
    backup.tables.VirtualIbanAccount = await prisma.virtualIbanAccount.findMany({
      include: {
        transactions: true,
      },
    });
    backup.counts.VirtualIbanAccount = backup.tables.VirtualIbanAccount.length;
    console.log(`  ✓ VirtualIbanAccount: ${backup.counts.VirtualIbanAccount}`);

    backup.tables.VirtualIbanTransaction = await prisma.virtualIbanTransaction.findMany();
    backup.counts.VirtualIbanTransaction = backup.tables.VirtualIbanTransaction.length;
    console.log(`  ✓ VirtualIbanTransaction: ${backup.counts.VirtualIbanTransaction}`);

    backup.tables.TopUpRequest = await prisma.topUpRequest.findMany();
    backup.counts.TopUpRequest = backup.tables.TopUpRequest.length;
    console.log(`  ✓ TopUpRequest: ${backup.counts.TopUpRequest}`);

    // ==========================================
    // INTEGRATIONS
    // ==========================================
    console.log('\n🔌 Integrations...');
    
    backup.tables.Integration = await prisma.integration.findMany();
    backup.counts.Integration = backup.tables.Integration.length;
    console.log(`  ✓ Integration: ${backup.counts.Integration}`);

    backup.tables.IntegrationSetting = await prisma.integrationSetting.findMany();
    backup.counts.IntegrationSetting = backup.tables.IntegrationSetting.length;
    console.log(`  ✓ IntegrationSetting: ${backup.counts.IntegrationSetting}`);

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    console.log('\n📬 Notifications...');
    
    backup.tables.NotificationEventCategory = await prisma.notificationEventCategory.findMany();
    backup.counts.NotificationEventCategory = backup.tables.NotificationEventCategory.length;
    console.log(`  ✓ NotificationEventCategory: ${backup.counts.NotificationEventCategory}`);

    backup.tables.NotificationEvent = await prisma.notificationEvent.findMany();
    backup.counts.NotificationEvent = backup.tables.NotificationEvent.length;
    console.log(`  ✓ NotificationEvent: ${backup.counts.NotificationEvent}`);

    backup.tables.EmailTemplate = await prisma.emailTemplate.findMany();
    backup.counts.EmailTemplate = backup.tables.EmailTemplate.length;
    console.log(`  ✓ EmailTemplate: ${backup.counts.EmailTemplate}`);

    // ==========================================
    // SAVE BACKUP
    // ==========================================
    console.log('\n💾 Сохранение бекапа...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(process.cwd(), 'backups', 'database');
    const backupFile = path.join(backupDir, `backup_prod_full_${timestamp}.json`);

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save backup
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    const fileSize = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(2);

    console.log(`  ✅ Saved: ${backupFile}`);
    console.log(`  📊 Size: ${fileSize} MB`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKUP COMPLETED');
    console.log('='.repeat(60));
    console.log();
    console.log('📊 Tables backed up:');
    
    const sortedCounts = Object.entries(backup.counts)
      .sort(([, a], [, b]) => b - a);
    
    for (const [table, count] of sortedCounts) {
      console.log(`   ${table.padEnd(30)} ${count.toString().padStart(6)} records`);
    }
    
    const totalRecords = Object.values(backup.counts).reduce((a, b) => a + b, 0);
    console.log('   ' + '-'.repeat(38));
    console.log(`   ${'TOTAL'.padEnd(30)} ${totalRecords.toString().padStart(6)} records`);
    console.log();
    console.log('📁 Backup file:', backupFile);
    console.log('💾 Size:', fileSize, 'MB');
    console.log();
    console.log('⚠️  Production база НЕ изменена (READ ONLY)');
    console.log();

  } catch (error) {
    console.error('\n❌ Backup error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('✅ Disconnected from production\n');
  }
}

// Run backup
backupProductionDatabase()
  .then(() => {
    console.log('✅ Backup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backup script failed:', error);
    process.exit(1);
  });

