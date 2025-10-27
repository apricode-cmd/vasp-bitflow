/**
 * Fix duplicate KYC fields
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateFields() {
  console.log('🔧 Fixing duplicate KYC fields...\n');

  // Disable old/duplicate fields
  const fieldsToDisable = [
    'phone_number', // Use 'phone' instead
    'country', // Use 'address_country'
    'city', // Use 'address_city'  
    'address', // Use 'address_street'
    'postal_code', // Use 'address_postal'
    'passport_number', // Done in KYCAID
    'document_front', // Done in KYCAID
    'document_back', // Done in KYCAID
    'selfie', // Done in KYCAID
  ];

  console.log(`Disabling ${fieldsToDisable.length} duplicate/old fields...`);
  
  for (const fieldName of fieldsToDisable) {
    const result = await prisma.kycFormField.updateMany({
      where: { fieldName },
      data: { isEnabled: false }
    });
    if (result.count > 0) {
      console.log(`  ❌ Disabled: ${fieldName}`);
    }
  }

  console.log('\n✅ Fixed duplicates!\n');

  // Show final summary
  const fields = await prisma.kycFormField.findMany({
    where: { isEnabled: true },
    orderBy: { priority: 'asc' },
    select: {
      fieldName: true,
      category: true,
      isRequired: true,
    }
  });

  const grouped = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof fields>);

  console.log('📋 Final enabled fields:\n');
  Object.entries(grouped).forEach(([category, categoryFields]) => {
    console.log(`${category.toUpperCase()}:`);
    categoryFields.forEach(f => {
      const req = f.isRequired ? '✅ Required' : '⚪️ Optional';
      console.log(`  ${req} - ${f.fieldName}`);
    });
    console.log('');
  });

  console.log(`📊 Total: ${fields.length} enabled fields\n`);
}

fixDuplicateFields()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

