/**
 * Production Database Dump Script
 * 
 * Downloads production database data to local JSON files
 * Bypasses pgbouncer limitations on free tier
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Production database connection
const DATABASE_URL = 'postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&statement_cache_size=0';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

const BACKUP_DIR = 'backups/production';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `bitflow_backup_prod_${TIMESTAMP}.json`);

async function dumpTable(tableName: string, query: any) {
  try {
    console.log(`📦 Dumping ${tableName}...`);
    const data = await query;
    console.log(`   ✅ ${tableName}: ${Array.isArray(data) ? data.length : 1} records`);
    return data;
  } catch (error) {
    console.error(`   ❌ ${tableName} failed:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function main() {
  console.log('🔐 Starting Production Database Dump...\n');
  console.log(`📁 Backup file: ${BACKUP_FILE}\n`);

  const backup: any = {
    metadata: {
      timestamp: new Date().toISOString(),
      database: 'bitflow-production',
      version: '1.0'
    },
    data: {}
  };

  try {
    // Core tables
    backup.data.users = await dumpTable('User', prisma.user.findMany({
      include: {
        profile: true,
        kycSession: true
      }
    }));

    backup.data.orders = await dumpTable('Order', prisma.order.findMany({
      include: {
        currency: true,
        fiatCurrency: true,
        paymentMethod: true,
        statusHistory: true
      }
    }));

    backup.data.currencies = await dumpTable('Currency', prisma.currency.findMany({
      include: {
        blockchainNetworks: {
          include: {
            blockchain: true
          }
        }
      }
    }));

    backup.data.fiatCurrencies = await dumpTable('FiatCurrency', prisma.fiatCurrency.findMany());

    backup.data.tradingPairs = await dumpTable('TradingPair', prisma.tradingPair.findMany({
      include: {
        crypto: true,
        fiat: true
      }
    }));

    backup.data.integrations = await dumpTable('Integration', prisma.integration.findMany());

    backup.data.systemSettings = await dumpTable('SystemSettings', prisma.systemSettings.findMany());

    backup.data.paymentMethods = await dumpTable('PaymentMethod', prisma.paymentMethod.findMany());

    backup.data.blockchainNetworks = await dumpTable('BlockchainNetwork', prisma.blockchainNetwork.findMany());

    backup.data.kycSessions = await dumpTable('KycSession', prisma.kycSession.findMany());

    backup.data.userWallets = await dumpTable('UserWallet', prisma.userWallet.findMany());

    // Admin/Audit tables
    backup.data.auditLogs = await dumpTable('AuditLog', prisma.auditLog.findMany({
      take: 1000, // Last 1000 logs only
      orderBy: { createdAt: 'desc' }
    }));

    backup.data.apiKeys = await dumpTable('ApiKey', prisma.apiKey.findMany());

    // Write to file
    console.log('\n💾 Writing backup to file...');
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

    // Get file size
    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📁 File: ${BACKUP_FILE}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    // Summary
    console.log('\n📋 Backup Summary:');
    for (const [table, data] of Object.entries(backup.data)) {
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
      console.log(`   ${table.padEnd(20)} ${count.toString().padStart(6)} records`);
    }

    console.log('\n🔐 Backup is safe to use for rollback.');
    console.log('\n💡 To restore:');
    console.log('   node scripts/restore-production-db.ts\n');

  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

