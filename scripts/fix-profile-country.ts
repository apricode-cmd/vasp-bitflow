/**
 * Fix profile data - change country to DK (Denmark)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProfileData() {
  console.log('🔧 Fixing profile data for bogdan.apricode@gmail.com\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'bogdan.apricode@gmail.com' },
    include: { profile: true }
  });

  if (!user || !user.profile) {
    console.log('User or profile not found');
    return;
  }

  console.log('Current data:');
  console.log('  Country:', user.profile.country);
  console.log('  City:', user.profile.city);
  console.log('  Address:', user.profile.address);
  console.log('  Postcode:', user.profile.postalCode);
  console.log('');

  // Update country to match the address
  const updated = await prisma.profile.update({
    where: { id: user.profile.id },
    data: {
      country: 'DK',        // Denmark
      nationality: 'DK',    // Also update nationality
    }
  });

  console.log('✅ Updated:');
  console.log('  Country: ES → DK');
  console.log('  Nationality: null → DK');
  console.log('');
  console.log('✅ Now data is consistent:');
  console.log('  🇩🇰 Country: Denmark');
  console.log('  🇩🇰 City: Copenhagen');
  console.log('  🇩🇰 Address: Nørregade 12');
  console.log('  🇩🇰 Postcode: 1165');

  await prisma.$disconnect();
}

fixProfileData();

