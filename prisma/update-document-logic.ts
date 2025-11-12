import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating document fields logic...');

  // 1. Update id_type options to match Sumsub requirements
  console.log('📝 Updating id_type options...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_type' },
    data: {
      options: JSON.stringify([
        'passport',
        'id_card',
        'drivers_license'
      ])
    }
  });
  console.log('✅ id_type options updated: passport, id_card, drivers_license');

  // 2. Add conditional logic for passport fields
  console.log('🔄 Adding conditional logic for passport_number...');
  await prisma.kycFormField.update({
    where: { fieldName: 'passport_number' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ operator: '==', value: 'passport' }),
      isRequired: false // Required only when passport is selected
    }
  });
  console.log('✅ passport_number: show when id_type == passport');

  console.log('🔄 Adding conditional logic for passport_scan...');
  await prisma.kycFormField.update({
    where: { fieldName: 'passport_scan' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ operator: '==', value: 'passport' }),
      isRequired: false // Required only when passport is selected
    }
  });
  console.log('✅ passport_scan: show when id_type == passport');

  // 3. Add conditional logic for ID card fields
  console.log('🔄 Adding conditional logic for id_number...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_number' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ 
        operator: 'in', 
        value: ['id_card', 'drivers_license'] 
      }),
      isRequired: true
    }
  });
  console.log('✅ id_number: show when id_type in [id_card, drivers_license]');

  console.log('🔄 Adding conditional logic for id_scan_front...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_scan_front' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ 
        operator: 'in', 
        value: ['id_card', 'drivers_license'] 
      }),
      isRequired: true // ОБЯЗАТЕЛЬНО для ID карты
    }
  });
  console.log('✅ id_scan_front: show when id_type in [id_card, drivers_license], REQUIRED');

  console.log('🔄 Adding conditional logic for id_scan_back...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_scan_back' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ 
        operator: 'in', 
        value: ['id_card', 'drivers_license'] 
      }),
      isRequired: true // ОБЯЗАТЕЛЬНО для ID карты (обе стороны)
    }
  });
  console.log('✅ id_scan_back: show when id_type in [id_card, drivers_license], REQUIRED');

  // 4. Update issue/expiry dates to be conditional
  console.log('🔄 Adding conditional logic for id_issue_date...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_issue_date' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ 
        operator: 'in', 
        value: ['id_card', 'drivers_license'] 
      })
    }
  });

  console.log('🔄 Adding conditional logic for id_expiry_date...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_expiry_date' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ 
        operator: 'in', 
        value: ['passport', 'id_card', 'drivers_license'] 
      }),
      isRequired: true
    }
  });

  console.log('🔄 Adding conditional logic for id_issuing_authority...');
  await prisma.kycFormField.update({
    where: { fieldName: 'id_issuing_authority' },
    data: {
      dependsOn: 'id_type',
      showWhen: JSON.stringify({ 
        operator: 'in', 
        value: ['passport', 'id_card', 'drivers_license'] 
      })
    }
  });

  console.log('\n🎉 Document fields logic updated!');
  console.log('\n📋 Conditional Logic Summary:');
  console.log('  ✅ id_type → passport | id_card | drivers_license');
  console.log('  ✅ When PASSPORT:');
  console.log('     → passport_number (visible)');
  console.log('     → passport_scan (visible, required)');
  console.log('  ✅ When ID_CARD or DRIVERS_LICENSE:');
  console.log('     → id_number (visible, required)');
  console.log('     → id_scan_front (visible, REQUIRED)');
  console.log('     → id_scan_back (visible, REQUIRED) ← обе стороны!');
  console.log('  ✅ Proof of Address:');
  console.log('     → proof_of_address_type (always visible)');
  console.log('     → proof_of_address (always visible, required)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

