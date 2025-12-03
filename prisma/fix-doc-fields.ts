/**
 * Fix document fields - enable conditional fields
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Fixing document fields...');

  // Enable ID document fields with conditional logic
  const fieldsToEnable = [
    'id_scan_front',
    'id_scan_back', 
    'id_number',
    'passport_number',
  ];

  for (const fieldName of fieldsToEnable) {
    await prisma.kycFormField.update({
      where: { fieldName },
      data: { isEnabled: true }
    });
    console.log(`✅ Enabled: ${fieldName}`);
  }

  console.log('✅ Done!');
}

main().finally(() => prisma.$disconnect());

