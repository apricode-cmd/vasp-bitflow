/**
 * Test Virtual IBAN creation for johnsmith@apricode.agency
 * Simulates the full user flow via API
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testVirtualIbanCreation() {
  console.log('🧪 Testing Virtual IBAN Creation Flow\n');

  const userEmail = 'johnsmith@apricode.agency';

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      profile: true,
      kycSession: true,
    },
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ User:', user.email);
  console.log('✅ KYC Status:', user.kycSession?.status);
  console.log('✅ Profile Complete:', !!user.profile);

  // Simulate API call to check eligibility
  console.log('\n📡 Step 1: Check Eligibility');
  console.log('   GET /api/client/virtual-iban/create');
  
  const eligibilityData = {
    eligible: true,
    hasExistingAccount: false,
    hasFailedAccount: false,
    existingAccount: null,
    kycStatus: user.kycSession?.status,
    kycApproved: user.kycSession?.status === 'APPROVED',
    profileComplete: true,
    userData: {
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      email: user.email,
      dateOfBirth: user.profile?.dateOfBirth,
      nationality: user.profile?.nationality,
      country: user.profile?.country,
      city: user.profile?.city,
      address: user.profile?.address,
      postalCode: user.profile?.postalCode,
    },
  };

  console.log('   ✅ Eligible:', eligibilityData.eligible);
  console.log('   ✅ User Data:', {
    name: `${eligibilityData.userData.firstName} ${eligibilityData.userData.lastName}`,
    address: eligibilityData.userData.address,
    city: eligibilityData.userData.city,
    country: eligibilityData.userData.country,
  });

  // Simulate user confirming (no edits)
  console.log('\n📡 Step 2: User Confirms (No Edits)');
  console.log('   POST /api/client/virtual-iban/create');
  console.log('   Body: {} (no editedData)');

  // Now test actual creation via service
  console.log('\n⚙️ Step 3: Creating Virtual IBAN...');
  
  try {
    const { virtualIbanService } = await import('../src/lib/services/virtual-iban.service');
    
    console.log('   → Calling virtualIbanService.createAccountForUser()');
    const startTime = Date.now();
    
    const account = await virtualIbanService.createAccountForUser(user.id);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 SUCCESS! Account created in ${duration}s`);
    console.log('   IBAN:', account.iban);
    console.log('   BIC:', account.bic);
    console.log('   Status:', account.status);
    console.log('   Bank:', account.bankName);
    console.log('   Currency:', account.currency);
    console.log('   Account Holder:', account.accountHolder);
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. User can now see IBAN in dashboard');
    console.log('   2. User can top up via bank transfer');
    console.log('   3. User can buy crypto with balance');

  } catch (error) {
    console.error('\n❌ Creation Failed:', error);
    
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      console.error('   Name:', error.name);
      
      if (error.name === 'VirtualIbanCreationTimeoutError') {
        console.error('\n⏱️  Timeout Error - This usually means:');
        console.error('   1. BCB rejected due to data validation');
        console.error('   2. Non-ASCII characters in data');
        console.error('   3. Country/City/Address mismatch');
        console.error('   4. BCB processing delay (rare)');
      }
    }
  }

  await prisma.$disconnect();
}

testVirtualIbanCreation().catch(console.error);

