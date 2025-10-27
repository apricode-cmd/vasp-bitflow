/**
 * KYC Fields Cleanup Script
 * 
 * Removes unnecessary fields and keeps only essential ones for MVP
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupKycFields() {
  console.log('🧹 Cleaning up KYC Form Fields...\n');

  // Disable unnecessary fields
  const fieldsToDisable = [
    'email', // Already in User
    'phone_country', // Managed by PhoneInput
    'address_region', // Not required
    'place_of_birth', // Optional
    'id_type', // Done in KYCAID form
    'id_number',
    'id_issuing_country',
    'id_issuing_authority',
    'id_issue_date',
    'id_expiry_date',
    'id_scan_front',
    'id_scan_back',
    'liveness_selfie',
    'pep_category', // Keep only pep_status
    'employer_name', // Keep only employment_status & occupation
    'intended_use', // Keep only purpose_of_account
    'expected_volume', // Not needed for MVP
    'expected_frequency',
    'source_of_wealth', // Keep only source_of_funds
    'consent_tfr', // Simplify to just privacy & kyc
  ];

  console.log(`Disabling ${fieldsToDisable.length} unnecessary fields...`);
  
  for (const fieldName of fieldsToDisable) {
    await prisma.kycFormField.updateMany({
      where: { fieldName },
      data: { isEnabled: false }
    });
  }

  console.log('✅ Disabled unnecessary fields\n');

  // Update essential fields to be required
  const requiredFields = [
    'first_name',
    'last_name',
    'date_of_birth',
    'nationality',
    'phone',
    'address_street',
    'address_city',
    'address_country',
    'address_postal',
    'pep_status',
    'source_of_funds',
    'consent_kyc',
    'consent_aml',
    'consent_privacy',
  ];

  console.log(`Ensuring ${requiredFields.length} essential fields are enabled and required...`);
  
  for (const fieldName of requiredFields) {
    await prisma.kycFormField.updateMany({
      where: { fieldName },
      data: { 
        isEnabled: true,
        isRequired: true
      }
    });
  }

  console.log('✅ Updated essential fields\n');

  // Optional but enabled fields
  const optionalFields = [
    'employment_status',
    'occupation',
    'purpose_of_account',
  ];

  console.log(`Setting ${optionalFields.length} fields as optional...`);
  
  for (const fieldName of optionalFields) {
    await prisma.kycFormField.updateMany({
      where: { fieldName },
      data: { 
        isEnabled: true,
        isRequired: false
      }
    });
  }

  console.log('✅ Updated optional fields\n');

  // Show summary
  const enabledCount = await prisma.kycFormField.count({
    where: { isEnabled: true }
  });

  const requiredCount = await prisma.kycFormField.count({
    where: { isEnabled: true, isRequired: true }
  });

  console.log('📊 Summary:');
  console.log(`  • Total enabled fields: ${enabledCount}`);
  console.log(`  • Required fields: ${requiredCount}`);
  console.log(`  • Optional fields: ${enabledCount - requiredCount}`);
  console.log('\n✅ KYC Fields cleanup completed!\n');
}

// Run cleanup
cleanupKycFields()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

