/**
 * Fix KYC Field Types
 * 
 * Changes:
 * 1. Restore place_of_birth if deleted
 * 2. Change nationality fieldType from 'select' to 'country'
 * 3. Change address_country fieldType from 'select' to 'country'
 * 4. Remove hardcoded options (CountryDropdown will provide countries)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing KYC field types...\n');

  // 1. Restore place_of_birth if it doesn't exist
  const placeOfBirth = await prisma.kycFormField.findUnique({
    where: { fieldName: 'place_of_birth' }
  });

  if (!placeOfBirth) {
    console.log('➕ Restoring place_of_birth field...');
    await prisma.kycFormField.create({
      data: {
        id: 'kyc-field-place_of_birth',
        fieldName: 'place_of_birth',
        label: 'Place of Birth',
        fieldType: 'text',
        category: 'personal',
        isRequired: false,
        isEnabled: true,
        priority: 4,
        validation: JSON.stringify({ maxLength: 100 })
      }
    });
    console.log('✅ place_of_birth restored\n');
  } else {
    console.log('✓ place_of_birth already exists\n');
  }

  // 2. Fix nationality fieldType
  const nationality = await prisma.kycFormField.findUnique({
    where: { fieldName: 'nationality' }
  });

  if (nationality) {
    if (nationality.fieldType !== 'country') {
      console.log('🔄 Updating nationality field...');
      await prisma.kycFormField.update({
        where: { fieldName: 'nationality' },
        data: {
          fieldType: 'country',
          options: null // Remove hardcoded options
        }
      });
      console.log('✅ nationality changed to type "country"\n');
    } else {
      console.log('✓ nationality already type "country"\n');
    }
  } else {
    console.log('⚠️  nationality field not found\n');
  }

  // 3. Fix address_country fieldType
  const addressCountry = await prisma.kycFormField.findUnique({
    where: { fieldName: 'address_country' }
  });

  if (addressCountry) {
    if (addressCountry.fieldType !== 'country') {
      console.log('🔄 Updating address_country field...');
      await prisma.kycFormField.update({
        where: { fieldName: 'address_country' },
        data: {
          fieldType: 'country',
          options: null // Remove hardcoded options
        }
      });
      console.log('✅ address_country changed to type "country"\n');
    } else {
      console.log('✓ address_country already type "country"\n');
    }
  } else {
    console.log('⚠️  address_country field not found\n');
  }

  console.log('🎉 KYC field types fixed!\n');
  console.log('Summary:');
  console.log('- place_of_birth: restored (if missing)');
  console.log('- nationality: fieldType changed to "country"');
  console.log('- address_country: fieldType changed to "country"');
  console.log('\nThese fields will now use CountryDropdown component.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

