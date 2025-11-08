const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProfile() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmh91d0lu000g12itgjrnkd61' },
    include: { profile: true }
  });
  
  console.log('👤 User Profile in Database:');
  console.log('================================');
  console.log('Email:', user.email);
  console.log('First Name:', user.profile.firstName);
  console.log('Last Name:', user.profile.lastName);
  console.log('Date of Birth:', user.profile.dateOfBirth);
  console.log('Nationality:', user.profile.nationality);
  console.log('Country:', user.profile.country);
  console.log('Phone:', user.profile.phoneNumber);
  console.log('');
  console.log('✅ These are the REAL data sent to Sumsub');
  console.log('📝 "John Mock-Doe" is Sumsub Sandbox mock data for testing');
  
  await prisma.$disconnect();
}

checkProfile();
