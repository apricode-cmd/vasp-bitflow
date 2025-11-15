const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStatusAPI() {
  console.log('🔍 Testing /api/kyc/status endpoint simulation...\n');
  
  // Simulate what the API does
  const session = await prisma.kycSession.findFirst({
    where: { userId: 'cmh91d0lu000g12itgjrnkd61' },
    orderBy: { createdAt: 'desc' }
  });

  console.log('📊 Current Session State:');
  console.log('  ID:', session.id);
  console.log('  Status:', session.status);
  console.log('  Applicant ID:', session.applicantId);
  console.log('  Verification ID:', session.verificationId);
  console.log('');
  
  console.log('📦 Metadata:');
  console.log('  Provider:', session.metadata?.provider);
  console.log('  externalUserId:', session.metadata?.applicant?.externalUserId);
  console.log('  applicantStatus:', session.metadata?.applicantStatus);
  console.log('  lastChecked:', session.metadata?.lastChecked);
  console.log('  formFieldsCount:', session.metadata?.formFieldsCount);
  console.log('');
  
  console.log('🎯 Verdict:');
  if (session.metadata?.applicant?.externalUserId === 'cmh91d0lu000g12itgjrnkd61-1762597014276') {
    console.log('  ✅ externalUserId СОХРАНЁН после всех операций!');
  } else {
    console.log('  ❌ externalUserId ПОТЕРЯН!');
  }
  
  await prisma.$disconnect();
}

testStatusAPI().catch(console.error);
