/**
 * Temporarily change name to test BCB creation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function changeNameForTest() {
  console.log('🔧 Temporarily changing name for BCB test\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'bogdan.apricode@gmail.com' },
    include: { profile: true }
  });

  if (!user || !user.profile) {
    console.log('User or profile not found');
    return;
  }

  console.log('Current name:', user.profile.firstName, user.profile.lastName);
  
  // Change to test name
  await prisma.profile.update({
    where: { id: user.profile.id },
    data: {
      firstName: 'Bogdan',
      lastName: 'Test'
    }
  });

  console.log('✅ Changed to: Bogdan Test');
  console.log('');
  console.log('Now try to create Virtual IBAN');
  console.log('');
  console.log('To restore:');
  console.log('  firstName: Bohdan');
  console.log('  lastName: Ivanov');

  await prisma.$disconnect();
}

changeNameForTest();

