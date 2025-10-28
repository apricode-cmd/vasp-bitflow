/**
 * Disable old text-based Purpose field
 * Run: npx ts-node prisma/disable-old-purpose.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Disabling old Purpose text field...');

  // Find and disable any old text-based purpose fields
  const result = await prisma.kycFormField.updateMany({
    where: {
      fieldName: 'purpose',
      fieldType: 'text'
    },
    data: {
      isEnabled: false
    }
  });

  console.log(`✅ Disabled ${result.count} old purpose text field(s)`);

  // Also check for any duplicate purpose fields that are not the select
  const allPurposeFields = await prisma.kycFormField.findMany({
    where: {
      fieldName: 'purpose'
    }
  });

  console.log('\n📋 Current purpose fields:');
  allPurposeFields.forEach(field => {
    console.log(`  - ID: ${field.id}, Type: ${field.fieldType}, Enabled: ${field.isEnabled}, Priority: ${field.priority}`);
  });

  // If there are multiple, keep only the select one
  const selectPurpose = allPurposeFields.find(f => f.fieldType === 'select');
  const otherPurposes = allPurposeFields.filter(f => f.fieldType !== 'select');

  if (selectPurpose && otherPurposes.length > 0) {
    console.log('\n🗑️ Disabling non-select purpose fields...');
    for (const field of otherPurposes) {
      await prisma.kycFormField.update({
        where: { id: field.id },
        data: { isEnabled: false }
      });
      console.log(`  ✅ Disabled ${field.fieldType} purpose field (ID: ${field.id})`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

