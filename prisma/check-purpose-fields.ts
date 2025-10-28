/**
 * Check purpose fields
 * Run: npx ts-node prisma/check-purpose-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Checking purpose fields...\n');

  const purposeFields = await prisma.kycFormField.findMany({
    where: {
      category: 'purpose'
    },
    orderBy: {
      priority: 'asc'
    }
  });

  if (purposeFields.length === 0) {
    console.log('❌ No fields found in category "purpose"');
    return;
  }

  console.log(`Found ${purposeFields.length} field(s) in category "purpose":\n`);
  
  purposeFields.forEach((field, index) => {
    console.log(`${index + 1}. ${field.fieldName}`);
    console.log(`   Type: ${field.fieldType}`);
    console.log(`   Label: ${field.label}`);
    console.log(`   Enabled: ${field.isEnabled}`);
    console.log(`   Required: ${field.isRequired}`);
    console.log(`   Priority: ${field.priority}`);
    if (field.options) {
      console.log(`   Options: ${field.options}`);
    }
    console.log('');
  });

  // Check for duplicates
  const fieldNames = purposeFields.map(f => f.fieldName);
  const duplicates = fieldNames.filter((item, index) => fieldNames.indexOf(item) !== index);
  
  if (duplicates.length > 0) {
    console.log(`⚠️ Found duplicate field names: ${[...new Set(duplicates)].join(', ')}`);
  } else {
    console.log('✅ No duplicate field names');
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

