/**
 * Check user data for johnsmith@apricode.agency
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'johnsmith@apricode.agency' },
    include: {
      profile: true,
      kycSession: true,
      virtualIbanAccounts: true,
    },
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ User found:', user.email);
  console.log('\n📋 User Details:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Created:', user.createdAt);

  console.log('\n👤 Profile:');
  if (user.profile) {
    console.log('   First Name:', user.profile.firstName);
    console.log('   Last Name:', user.profile.lastName);
    console.log('   DOB:', user.profile.dateOfBirth);
    console.log('   Country:', user.profile.country);
    console.log('   City:', user.profile.city);
    console.log('   Address:', user.profile.address);
    console.log('   Postal Code:', user.profile.postalCode);
    console.log('   Nationality:', user.profile.nationality);
  } else {
    console.log('   ❌ No profile');
  }

  console.log('\n🔐 KYC Status:');
  if (user.kycSession) {
    console.log('   Status:', user.kycSession.status);
    console.log('   Provider:', user.kycSession.provider);
    console.log('   Created:', user.kycSession.createdAt);
    console.log('   Updated:', user.kycSession.updatedAt);
  } else {
    console.log('   ❌ No KYC session');
  }

  console.log('\n💳 Virtual IBAN Accounts:');
  if (user.virtualIbanAccounts.length > 0) {
    user.virtualIbanAccounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. ${acc.iban} (${acc.status})`);
    });
  } else {
    console.log('   ✓ No accounts (ready to create)');
  }

  console.log('\n📊 Eligibility Check:');
  const eligible = 
    user.profile &&
    user.profile.firstName &&
    user.profile.lastName &&
    user.profile.country &&
    user.profile.city &&
    user.profile.address &&
    user.profile.dateOfBirth &&
    user.kycSession?.status === 'APPROVED';

  if (eligible) {
    console.log('   ✅ ELIGIBLE for Virtual IBAN creation');
    console.log('\n🧪 Test Ready:');
    console.log('   1. Login as:', user.email);
    console.log('   2. Navigate to /virtual-iban');
    console.log('   3. Click "Get My Virtual IBAN"');
    console.log('   4. Test the new editable dialog');
  } else {
    console.log('   ❌ NOT ELIGIBLE');
    if (!user.profile) console.log('      → Missing profile');
    if (user.profile && !user.profile.firstName) console.log('      → Missing first name');
    if (user.profile && !user.profile.lastName) console.log('      → Missing last name');
    if (user.profile && !user.profile.dateOfBirth) console.log('      → Missing date of birth');
    if (user.profile && !user.profile.address) console.log('      → Missing address');
    if (user.kycSession?.status !== 'APPROVED') console.log('      → KYC not approved');
  }

  await prisma.$disconnect();
}

checkUser().catch(console.error);

