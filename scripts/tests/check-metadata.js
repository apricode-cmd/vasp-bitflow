const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMetadata() {
  const session = await prisma.kycSession.findUnique({
    where: { userId: 'cmh91d0lu000g12itgjrnkd61' }
  });
  
  console.log('📊 KYC Session Metadata Check:');
  console.log('================================');
  console.log('Session ID:', session.id);
  console.log('Applicant ID:', session.applicantId);
  console.log('Verification ID:', session.verificationId);
  console.log('');
  console.log('📦 Metadata:');
  console.log(JSON.stringify(session.metadata, null, 2));
  console.log('');
  console.log('✅ externalUserId preserved?', 
    session.metadata?.applicant?.externalUserId ? 'YES ✅' : 'NO ❌'
  );
  
  if (session.metadata?.applicant?.externalUserId) {
    console.log('   Value:', session.metadata.applicant.externalUserId);
  }
  
  await prisma.$disconnect();
}

checkMetadata().catch(console.error);
