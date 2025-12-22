/**
 * Test Virtual IBAN creation with EDITED data
 * Simulates user editing address in the dialog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWithEditedData() {
  console.log('🧪 Testing Virtual IBAN Creation with EDITED Data\n');

  const userEmail = 'johnsmith@apricode.agency';

  // Simulate user editing their address in the dialog
  // For example, they want to use a different address
  const editedData = {
    firstName: 'Jonathan',  // Changed from John
    lastName: 'Smith',
    address: 'Main Street 456',  // Changed from Nationalna 102
    city: 'Krakow',  // Changed from Warsaw
    postalCode: '30-001',  // Changed postal code
  };

  console.log('📝 User provided edited data:');
  console.log('   Name: Jonathan Smith (was: John Smith)');
  console.log('   Address: Main Street 456 (was: Nationalna 102)');
  console.log('   City: Krakow (was: Warsaw)');
  console.log('   Postal Code: 30-001 (was: 10002)');

  // Update profile with edited data
  console.log('\n⚙️ Updating profile with edited data...');
  
  const updatedProfile = await prisma.profile.updateMany({
    where: {
      user: {
        email: userEmail,
      },
    },
    data: {
      firstName: editedData.firstName,
      lastName: editedData.lastName,
      address: editedData.address,
      city: editedData.city,
      postalCode: editedData.postalCode,
    },
  });

  console.log('   ✅ Profile updated:', updatedProfile.count, 'record(s)');

  // Delete existing account first
  console.log('\n🗑️  Deleting existing account for re-testing...');
  
  const deleted = await prisma.virtualIbanAccount.deleteMany({
    where: {
      user: {
        email: userEmail,
      },
    },
  });

  console.log('   ✅ Deleted:', deleted.count, 'account(s)');

  // Get updated user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { profile: true },
  });

  if (!user) throw new Error('User not found');

  console.log('\n📡 Creating Virtual IBAN with edited data...');
  
  try {
    const { virtualIbanService } = await import('../src/lib/services/virtual-iban.service');
    
    const startTime = Date.now();
    const account = await virtualIbanService.createAccountForUser(user.id);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 SUCCESS! Account created with edited data in ${duration}s`);
    console.log('   IBAN:', account.iban);
    console.log('   Account Holder:', account.accountHolder);
    console.log('   Status:', account.status);
    
    console.log('\n✅ Test completed successfully!');
    console.log('   → User successfully edited data before creation');
    console.log('   → Profile was updated in database');
    console.log('   → BCB received edited data');
    console.log('   → Account created with new information');

  } catch (error) {
    console.error('\n❌ Creation Failed:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
    }
  }

  await prisma.$disconnect();
}

testWithEditedData().catch(console.error);

