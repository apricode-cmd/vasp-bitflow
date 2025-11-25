import { prisma } from './src/lib/prisma';
import { integrationFactory } from './src/lib/integrations/IntegrationFactory';

async function syncKycStatus() {
  try {
    const kycSessionId = 'cmiebh3oe0055148icer54676';
    
    console.log('🔄 Syncing KYC status...');
    
    const kycSession = await prisma.kycSession.findUnique({
      where: { id: kycSessionId }
    });
    
    if (!kycSession || !kycSession.applicantId) {
      console.log('❌ KYC session or applicantId not found');
      return;
    }
    
    console.log('📋 Current DB Status:', kycSession.status);
    
    const provider = await integrationFactory.getKycProvider();
    const sumsubStatus = await provider.getVerificationStatus(kycSession.applicantId);
    
    console.log('✅ Sumsub Status:', sumsubStatus.status);
    console.log('📊 Review Answer:', sumsubStatus.metadata?.reviewResult?.reviewAnswer);
    
    // Update database
    const updated = await prisma.kycSession.update({
      where: { id: kycSessionId },
      data: {
        status: sumsubStatus.status === 'approved' ? 'APPROVED' : 
                sumsubStatus.status === 'rejected' ? 'REJECTED' : 
                'PENDING',
        reviewedAt: sumsubStatus.completedAt || new Date(),
        rejectionReason: null,
        rejectLabels: { set: [] },
        reviewRejectType: null,
        moderationComment: null
      }
    });
    
    console.log('\n✅ Database updated:');
    console.log('  New Status:', updated.status);
    console.log('  Reviewed At:', updated.reviewedAt);
    console.log('  Reject Labels:', updated.rejectLabels);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncKycStatus();
