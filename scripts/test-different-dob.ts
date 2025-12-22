/**
 * Test BCB with modified date of birth
 * Hypothesis: BCB rejects if DOB already exists in their system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDifferentDOB() {
  console.log('🧪 Testing with modified date of birth\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'bogdan.apricode@gmail.com' },
    include: { profile: true }
  });

  if (!user || !user.profile) {
    console.log('User or profile not found');
    return;
  }

  console.log('Current DOB:', user.profile.dateOfBirth);
  console.log('');
  console.log('💡 Suggestion: Temporarily change DOB to test BCB creation');
  console.log('   For example: 1990-05-15');
  console.log('');
  console.log('   Run this to change:');
  console.log('   UPDATE "Profile" SET "dateOfBirth" = \'1990-05-15T12:00:00.000Z\' WHERE "userId" = \'' + user.id + '\';');

  await prisma.$disconnect();
}

testDifferentDOB();

