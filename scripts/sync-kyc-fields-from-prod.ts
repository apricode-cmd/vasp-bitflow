/**
 * Sync KYC Form Fields from Production
 * 
 * UPSERT only - не удаляет существующие поля
 */

import { PrismaClient } from '@prisma/client';

const prodPrisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'
});

const localPrisma = new PrismaClient();

async function syncKycFields() {
  try {
    console.log('🔄 Fetching KYC fields from production...');
    
    const prodFields = await prodPrisma.kycFormField.findMany({
      orderBy: { priority: 'asc' }
    });

    console.log(`📊 Found ${prodFields.length} fields in production`);
    console.log('📝 Upserting to local database...');

    let updated = 0;
    let created = 0;

    for (const field of prodFields) {
      const existing = await localPrisma.kycFormField.findUnique({
        where: { id: field.id }
      });

      await localPrisma.kycFormField.upsert({
        where: { id: field.id },
        create: {
          id: field.id,
          fieldName: field.fieldName,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isEnabled: field.isEnabled,
          category: field.category,
          validation: field.validation,
          options: field.options,
          priority: field.priority,
          createdAt: field.createdAt,
          updatedAt: field.updatedAt,
          // New fields from production
          dependsOn: field.dependsOn,
          showWhen: field.showWhen,
          helpText: field.helpText,
          placeholder: field.placeholder,
          customClass: field.customClass,
        },
        update: {
          fieldName: field.fieldName,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isEnabled: field.isEnabled,
          category: field.category,
          validation: field.validation,
          options: field.options,
          priority: field.priority,
          updatedAt: new Date(),
          dependsOn: field.dependsOn,
          showWhen: field.showWhen,
          helpText: field.helpText,
          placeholder: field.placeholder,
          customClass: field.customClass,
        }
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }

      if ((created + updated) % 10 === 0) {
        console.log(`  Progress: ${created + updated}/${prodFields.length}`);
      }
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${created + updated}`);

    // Verify
    const localCount = await localPrisma.kycFormField.count();
    console.log(`\n📊 Local database now has ${localCount} KYC fields`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    await prodPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

syncKycFields();

