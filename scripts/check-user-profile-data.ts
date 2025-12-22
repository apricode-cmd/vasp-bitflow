/**
 * Check user profile data for bogdan.apricode@gmail.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserProfile() {
  const user = await prisma.user.findUnique({
    where: {
      email: 'bogdan.apricode@gmail.com'
    },
    include: {
      profile: true,
      kycSession: true
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('👤 User:', user.email);
  console.log('📋 KYC Status:', user.kycSession?.status);
  console.log('');
  console.log('📍 Profile Data:');
  console.log('   Name:', user.profile?.firstName, user.profile?.lastName);
  console.log('   Country:', user.profile?.country);
  console.log('   City:', user.profile?.city);
  console.log('   Address:', user.profile?.address);
  console.log('   Postcode:', user.profile?.postalCode);
  console.log('   Nationality:', user.profile?.nationality);
  console.log('   Date of Birth:', user.profile?.dateOfBirth);
  console.log('');
  
  // Check for data inconsistency
  const city = user.profile?.city || '';
  const country = user.profile?.country || '';
  const postcode = user.profile?.postalCode || '';
  
  console.log('🔍 Data Validation:');
  
  if (city === 'Copenhagen' && country !== 'DK') {
    console.log('   ❌ Copenhagen is in Denmark (DK), but country is:', country);
  }
  
  if (postcode === '1165' && country !== 'DK') {
    console.log('   ❌ Postcode 1165 is Danish, but country is:', country);
  }
  
  if (user.profile?.address?.includes('Nørregade') && country !== 'DK') {
    console.log('   ❌ Nørregade is a Danish address, but country is:', country);
  }
  
  console.log('');
  console.log('💡 Recommendation:');
  console.log('   Either change country to DK (Denmark)');
  console.log('   OR change city/address to match Spain (ES)');

  await prisma.$disconnect();
}

checkUserProfile();

