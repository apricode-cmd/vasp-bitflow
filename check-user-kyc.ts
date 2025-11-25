import { prisma } from './src/lib/prisma';

async function checkUserKyc() {
  try {
    const email = 'walker@apricode.agency';
    
    console.log('🔍 Checking KYC for:', email);
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        kycSession: {
          include: {
            documents: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n👤 User ID:', user.id);
    console.log('📧 Email:', user.email);
    
    if (!user.kycSession) {
      console.log('❌ No KYC session found');
      return;
    }
    
    const kycSession = user.kycSession;
    
    console.log('\n📋 KYC Session:');
    console.log('  ID:', kycSession.id);
    console.log('  Status:', kycSession.status);
    console.log('  Provider:', kycSession.kycProviderId);
    console.log('  Applicant ID:', kycSession.applicantId);
    console.log('  Created:', kycSession.createdAt);
    console.log('  Submitted:', kycSession.submittedAt);
    console.log('  Reviewed:', kycSession.reviewedAt);
    console.log('  Attempts:', kycSession.attempts);
    
    if (kycSession.rejectionReason) {
      console.log('\n❌ Rejection Reason:', kycSession.rejectionReason);
    }
    
    if (kycSession.rejectLabels) {
      console.log('🏷️  Reject Labels:', kycSession.rejectLabels);
    }
    
    if (kycSession.reviewRejectType) {
      console.log('🔄 Reject Type:', kycSession.reviewRejectType);
    }
    
    if (kycSession.moderationComment) {
      console.log('💬 Moderation Comment:', kycSession.moderationComment);
    }
    
    console.log('\n📄 Documents:', kycSession.documents.length);
    kycSession.documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.documentType} - ${doc.documentStatus || 'N/A'}`);
    });
    
    // Проверим статус в Sumsub
    if (kycSession.applicantId) {
      console.log('\n🔍 Checking Sumsub status...');
      const { integrationFactory } = await import('./src/lib/integrations/IntegrationFactory');
      const provider = await integrationFactory.getKycProvider();
      const status = await provider.getVerificationStatus(kycSession.applicantId);
      console.log('✅ Sumsub Status:', status.status);
      console.log('📊 Review Answer:', status.metadata?.reviewResult?.reviewAnswer);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserKyc();
