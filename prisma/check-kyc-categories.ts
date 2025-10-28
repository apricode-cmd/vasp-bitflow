/**
 * Check KYC Form Field Categories
 * Run: npx ts-node prisma/check-kyc-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Checking KYC Form Field Categories...\n');

  // Get distinct categories
  const categories = await prisma.kycFormField.findMany({
    where: { isEnabled: true },
    select: {
      category: true
    },
    distinct: ['category']
  });

  console.log(`Found ${categories.length} categories:\n`);
  
  for (const cat of categories) {
    const count = await prisma.kycFormField.count({
      where: {
        isEnabled: true,
        category: cat.category
      }
    });
    
    console.log(`  📁 ${cat.category} (${count} fields)`);
  }

  console.log('\n---\n');

  // Group fields by category
  for (const cat of categories) {
    const fields = await prisma.kycFormField.findMany({
      where: {
        isEnabled: true,
        category: cat.category
      },
      select: {
        fieldName: true,
        label: true,
        fieldType: true,
        isRequired: true
      },
      orderBy: { priority: 'asc' }
    });

    console.log(`\n📂 ${cat.category.toUpperCase()} (${fields.length} fields):`);
    fields.forEach(field => {
      const req = field.isRequired ? '* ' : '  ';
      console.log(`  ${req}${field.fieldName} (${field.fieldType})`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

