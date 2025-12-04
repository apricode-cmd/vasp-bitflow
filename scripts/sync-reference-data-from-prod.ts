/**
 * Sync Reference Data from Production (Correct Version)
 * 
 * Синхронизирует справочные данные из продакшн базы:
 * - BlockchainNetwork (блокчейн сети)
 * - PaymentMethod (способы оплаты)
 * - EmailTemplate (email шаблоны)
 * 
 * ВАЖНО: Использует upsert - НЕ удаляет существующие данные!
 * 
 * Usage:
 * npx tsx scripts/sync-reference-data-from-prod.ts
 */

import { PrismaClient } from '@prisma/client';

// Production database URL
const PROD_DB_URL = 'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

// Create two Prisma clients
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DB_URL,
    },
  },
});

const localPrisma = new PrismaClient();

async function syncBlockchainNetworks() {
  console.log('\n📡 Syncing BlockchainNetwork...');
  
  try {
    const prodNetworks = await prodPrisma.blockchainNetwork.findMany({
      orderBy: { code: 'asc' },
    });

    console.log(`   Found ${prodNetworks.length} networks in production`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const network of prodNetworks) {
      const result = await localPrisma.blockchainNetwork.upsert({
        where: { code: network.code },
        create: {
          code: network.code,
          name: network.name,
          symbol: network.symbol,
          nativeToken: network.nativeToken,
          nativeAsset: network.nativeAsset,
          explorerUrl: network.explorerUrl,
          rpcUrl: network.rpcUrl,
          chainId: network.chainId,
          minConfirmations: network.minConfirmations,
          confirmations: network.confirmations,
          isActive: network.isActive,
          priority: network.priority,
          metadata: network.metadata,
        },
        update: {
          name: network.name,
          symbol: network.symbol,
          nativeToken: network.nativeToken,
          nativeAsset: network.nativeAsset,
          explorerUrl: network.explorerUrl,
          rpcUrl: network.rpcUrl,
          chainId: network.chainId,
          minConfirmations: network.minConfirmations,
          confirmations: network.confirmations,
          isActive: network.isActive,
          priority: network.priority,
          metadata: network.metadata,
        },
      });

      // Check if it was created or updated
      const existing = await localPrisma.blockchainNetwork.findFirst({
        where: { 
          code: network.code,
          createdAt: result.createdAt 
        }
      });
      
      if (existing && existing.createdAt.getTime() === result.createdAt.getTime()) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`   ✅ Synced ${prodNetworks.length} networks (${createdCount} new, ${updatedCount} updated)`);
  } catch (error) {
    console.error('   ❌ Error syncing BlockchainNetwork:', error);
    throw error;
  }
}

async function syncPaymentMethods() {
  console.log('\n💳 Syncing PaymentMethod...');
  
  try {
    const prodMethods = await prodPrisma.paymentMethod.findMany({
      orderBy: { code: 'asc' },
    });

    console.log(`   Found ${prodMethods.length} payment methods in production`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const method of prodMethods) {
      const existing = await localPrisma.paymentMethod.findUnique({
        where: { code: method.code },
      });

      // Check if referenced PaymentAccount exists
      let paymentAccountId = method.paymentAccountId;
      if (paymentAccountId) {
        const accountExists = await localPrisma.paymentAccount.findUnique({
          where: { id: paymentAccountId },
        });
        if (!accountExists) {
          console.log(`   ⚠️  PaymentAccount ${paymentAccountId} not found for ${method.code}, setting to null`);
          paymentAccountId = null;
        }
      }

      // Check if referenced BankAccount exists
      let bankAccountId = method.bankAccountId;
      if (bankAccountId) {
        const accountExists = await localPrisma.bankAccount.findUnique({
          where: { id: bankAccountId },
        });
        if (!accountExists) {
          console.log(`   ⚠️  BankAccount ${bankAccountId} not found for ${method.code}, setting to null`);
          bankAccountId = null;
        }
      }

      await localPrisma.paymentMethod.upsert({
        where: { code: method.code },
        create: {
          code: method.code,
          name: method.name,
          description: method.description,
          type: method.type,
          direction: method.direction,
          providerType: method.providerType,
          automationLevel: method.automationLevel,
          currency: method.currency,
          supportedNetworks: method.supportedNetworks,
          pspConnector: method.pspConnector,
          paymentAccountId: paymentAccountId,
          bankAccountId: bankAccountId,
          minAmount: method.minAmount,
          maxAmount: method.maxAmount,
          feeFixed: method.feeFixed,
          feePercent: method.feePercent,
          processingTime: method.processingTime,
          instructions: method.instructions,
          iconUrl: method.iconUrl,
          priority: method.priority,
          config: method.config,
          isActive: method.isActive,
          isAvailableForClients: method.isAvailableForClients,
          createdBy: method.createdBy,
        },
        update: {
          name: method.name,
          description: method.description,
          type: method.type,
          direction: method.direction,
          providerType: method.providerType,
          automationLevel: method.automationLevel,
          currency: method.currency,
          supportedNetworks: method.supportedNetworks,
          pspConnector: method.pspConnector,
          paymentAccountId: paymentAccountId,
          bankAccountId: bankAccountId,
          minAmount: method.minAmount,
          maxAmount: method.maxAmount,
          feeFixed: method.feeFixed,
          feePercent: method.feePercent,
          processingTime: method.processingTime,
          instructions: method.instructions,
          iconUrl: method.iconUrl,
          priority: method.priority,
          config: method.config,
          isActive: method.isActive,
          isAvailableForClients: method.isAvailableForClients,
          createdBy: method.createdBy,
        },
      });

      if (existing) {
        updatedCount++;
      } else {
        createdCount++;
      }
    }

    console.log(`   ✅ Synced ${prodMethods.length} payment methods (${createdCount} new, ${updatedCount} updated)`);
  } catch (error) {
    console.error('   ❌ Error syncing PaymentMethod:', error);
    throw error;
  }
}

async function syncEmailTemplates() {
  console.log('\n📧 Syncing EmailTemplate...');
  
  try {
    const prodTemplates = await prodPrisma.emailTemplate.findMany({
      orderBy: { key: 'asc' },
    });

    console.log(`   Found ${prodTemplates.length} email templates in production`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const template of prodTemplates) {
      // Find existing by unique constraint: orgId + key + version
      const existing = await localPrisma.emailTemplate.findFirst({
        where: {
          orgId: template.orgId,
          key: template.key,
          version: template.version,
        },
      });

      if (existing) {
        // Update existing
        await localPrisma.emailTemplate.update({
          where: { id: existing.id },
          data: {
            name: template.name,
            description: template.description,
            category: template.category,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            preheader: template.preheader,
            layout: template.layout,
            variables: template.variables,
            metadata: template.metadata,
            isActive: template.isActive,
            isDefault: template.isDefault,
            status: template.status,
            publishedAt: template.publishedAt,
            publishedBy: template.publishedBy,
            createdBy: template.createdBy,
            updatedBy: template.updatedBy,
            editorContent: template.editorContent,
          },
        });
        updatedCount++;
      } else {
        // Create new
        await localPrisma.emailTemplate.create({
          data: {
            orgId: template.orgId,
            key: template.key,
            name: template.name,
            description: template.description,
            category: template.category,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            preheader: template.preheader,
            layout: template.layout,
            variables: template.variables,
            metadata: template.metadata,
            version: template.version,
            isActive: template.isActive,
            isDefault: template.isDefault,
            status: template.status,
            publishedAt: template.publishedAt,
            publishedBy: template.publishedBy,
            createdBy: template.createdBy,
            updatedBy: template.updatedBy,
            editorContent: template.editorContent,
          },
        });
        createdCount++;
      }
    }

    console.log(`   ✅ Synced ${prodTemplates.length} email templates (${createdCount} new, ${updatedCount} updated)`);
  } catch (error) {
    console.error('   ❌ Error syncing EmailTemplate:', error);
    throw error;
  }
}

async function main() {
  console.log('🔄 Starting reference data sync from production...\n');
  console.log('📊 Production DB:', PROD_DB_URL.split('@')[1]?.split('/')[0]);
  console.log('📊 Local DB: apricode_dev (localhost)');

  try {
    // Test connections
    await prodPrisma.$connect();
    await localPrisma.$connect();
    console.log('✅ Database connections established');

    // Sync data
    await syncBlockchainNetworks();
    await syncPaymentMethods();
    await syncEmailTemplates();

    console.log('\n✅ All reference data synced successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✓ BlockchainNetwork: synced');
    console.log('   ✓ PaymentMethod: synced');
    console.log('   ✓ EmailTemplate: synced');
    console.log('\n💡 No data was deleted - only added or updated!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prodPrisma.$disconnect();
    await localPrisma.$disconnect();
  });
