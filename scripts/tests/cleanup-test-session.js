const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🗑️  Cleaning up test session for fresh test...\n');
  
  const deleted = await prisma.kycSession.delete({
    where: { userId: 'cmh91d0lu000g12itgjrnkd61' }
  });
  
  console.log('✅ Deleted session:', deleted.id);
  console.log('✅ Ready for fresh KYC test!');
  
  await prisma.$disconnect();
}

cleanup().catch(console.error);
