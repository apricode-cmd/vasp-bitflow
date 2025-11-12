/**
 * Disable old purpose_of_account field
 * Keep only the new 'purpose' select field
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function disablePurposeOfAccount() {
  console.log('🔧 Disabling old purpose_of_account field...\n');

  // Disable old purpose_of_account field
  const result = await prisma.kycFormField.updateMany({
    where: {
      fieldName: 'purpose_of_account'
    },
    data: {
      isEnabled: false,
      isRequired: false
    }
  });

  console.log(`✅ Disabled ${result.count} field(s) with fieldName='purpose_of_account'\n`);

  // Check current state
  const purposeFields = await prisma.kycFormField.findMany({
    where: {
      fieldName: {
        in: ['purpose', 'purpose_of_account', 'purpose_note']
      }
    },
    orderBy: { priority: 'asc' }
  });

  console.log('📋 Current purpose-related fields:');
  purposeFields.forEach(f => {
    console.log(`  - ${f.fieldName} (${f.fieldType}): enabled=${f.isEnabled}, required=${f.isRequired}, label="${f.label}"`);
  });
}

disablePurposeOfAccount()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

