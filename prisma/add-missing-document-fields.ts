import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📄 Adding missing KYC document fields...');

  // 1. Update id_issuing_country to use 'country' fieldType
  console.log('🔄 Updating id_issuing_country to country fieldType...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_issuing_country' },
    data: {
      fieldType: 'country',
      options: null // Remove hardcoded options
    }
  });
  console.log('✅ id_issuing_country updated');

  // 2. Add passport_number field (if passport is used instead of ID card)
  console.log('🔄 Adding passport_number field...');
  await prisma.kycFormField.upsert({
    where: { fieldName: 'passport_number' },
    update: {
      label: 'Passport Number',
      fieldType: 'text',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 28,
      validation: JSON.stringify({ minLength: 5, maxLength: 20 })
    },
    create: {
      id: 'kyc-field-passport_number',
      fieldName: 'passport_number',
      label: 'Passport Number',
      fieldType: 'text',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 28,
      validation: JSON.stringify({ minLength: 5, maxLength: 20 })
    }
  });
  console.log('✅ passport_number added');

  // 3. Add passport_scan field
  console.log('🔄 Adding passport_scan field...');
  await prisma.kycFormField.upsert({
    where: { fieldName: 'passport_scan' },
    update: {
      label: 'Passport Scan',
      fieldType: 'file',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 29,
      validation: JSON.stringify({ 
        acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'], 
        maxSize: 10485760 
      })
    },
    create: {
      id: 'kyc-field-passport_scan',
      fieldName: 'passport_scan',
      label: 'Passport Scan',
      fieldType: 'file',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 29,
      validation: JSON.stringify({ 
        acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'], 
        maxSize: 10485760 
      })
    }
  });
  console.log('✅ passport_scan added');

  // 4. Add proof_of_address field (UTILITY_BILL)
  console.log('🔄 Adding proof_of_address field...');
  await prisma.kycFormField.upsert({
    where: { fieldName: 'proof_of_address' },
    update: {
      label: 'Proof of Address',
      fieldType: 'file',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 39,
      validation: JSON.stringify({ 
        acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'], 
        maxSize: 10485760 
      })
    },
    create: {
      id: 'kyc-field-proof_of_address',
      fieldName: 'proof_of_address',
      label: 'Proof of Address',
      fieldType: 'file',
      category: 'documents',
      isRequired: true,
      isEnabled: true,
      priority: 39,
      validation: JSON.stringify({ 
        acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'], 
        maxSize: 10485760 
      })
    }
  });
  console.log('✅ proof_of_address added');

  // 5. Add proof_of_address_type field
  console.log('🔄 Adding proof_of_address_type field...');
  await prisma.kycFormField.upsert({
    where: { fieldName: 'proof_of_address_type' },
    update: {
      label: 'Proof of Address Type',
      fieldType: 'select',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 38.5,
      options: JSON.stringify(['utility_bill', 'bank_statement', 'tax_statement', 'rental_agreement', 'other'])
    },
    create: {
      id: 'kyc-field-proof_of_address_type',
      fieldName: 'proof_of_address_type',
      label: 'Proof of Address Type',
      fieldType: 'select',
      category: 'documents',
      isRequired: false,
      isEnabled: true,
      priority: 38.5,
      options: JSON.stringify(['utility_bill', 'bank_statement', 'tax_statement', 'rental_agreement', 'other'])
    }
  });
  console.log('✅ proof_of_address_type added');

  console.log('\n🎉 Missing document fields added successfully!');
  console.log('\n📋 Summary:');
  console.log('  ✅ id_issuing_country → country fieldType');
  console.log('  ✅ passport_number → text');
  console.log('  ✅ passport_scan → file');
  console.log('  ✅ proof_of_address → file');
  console.log('  ✅ proof_of_address_type → select');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

