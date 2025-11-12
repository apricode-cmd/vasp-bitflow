import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Moving Proof of Address to Residential Address section...');

  // 1. Move proof_of_address_type to 'address' category
  console.log('🔄 Moving proof_of_address_type...');
  await prisma.kycFormField.update({
    where: { fieldName: 'proof_of_address_type' },
    data: {
      category: 'address',
      priority: 25, // After postal code (priority ~24)
    }
  });
  console.log('✅ proof_of_address_type → address category (priority 25)');

  // 2. Move proof_of_address to 'address' category
  console.log('🔄 Moving proof_of_address...');
  await prisma.kycFormField.update({
    where: { fieldName: 'proof_of_address' },
    data: {
      category: 'address',
      priority: 26, // After proof_of_address_type
    }
  });
  console.log('✅ proof_of_address → address category (priority 26)');

  console.log('\n🎉 Proof of Address moved to Residential Address section!');
  console.log('\n📋 Summary:');
  console.log('  BEFORE: Step 3 (Identity Documents) → Compliance Profile');
  console.log('  AFTER:  Step 2 (Residential Address) → Contact & Address');
  console.log('\n  Now shows:');
  console.log('  - Street address, city, postal code');
  console.log('  - Proof of Address Type (select)');
  console.log('  - Proof of Address (file upload) ← REQUIRED');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

