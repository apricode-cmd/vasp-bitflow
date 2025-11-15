/**
 * Debug KYCAID applicant and documents
 */

import { prisma } from './src/lib/prisma';
import { kycaidAdapter } from './src/lib/integrations/providers/kyc/KycaidAdapter';
import { getIntegrationWithSecrets } from './src/lib/services/integration-management.service';

async function debugApplicant() {
  try {
    console.log('🔍 Debug KYCAID Applicant & Documents\n');
    
    // Get latest APPROVED session
    const session = await prisma.kycSession.findFirst({
      where: {
        status: 'APPROVED',
        kycaidApplicantId: { not: null }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    if (!session) {
      console.error('❌ No APPROVED session found');
      return;
    }
    
    console.log('✅ Found session:');
    console.log('  - User:', session.user.email);
    console.log('  - Status:', session.status);
    console.log('  - Applicant ID:', session.kycaidApplicantId);
    console.log('  - Verification ID:', session.kycaidVerificationId || 'N/A');
    console.log('');
    
    // Initialize KYCAID
    const secrets = await getIntegrationWithSecrets('kycaid');
    await kycaidAdapter.initialize({
      apiKey: secrets?.apiKey || '',
      apiEndpoint: secrets?.apiEndpoint || undefined,
      ...(secrets?.config as any || {})
    });
    
    console.log('═'.repeat(70));
    console.log('1️⃣ GET /applicants/{applicant_id} (without verification_id)');
    console.log('═'.repeat(70));
    try {
      const applicant1 = await kycaidAdapter.getApplicant(session.kycaidApplicantId!);
      console.log('✅ Response:');
      console.log('  - Status:', applicant1.status);
      console.log('  - Verification Status:', applicant1.metadata?.verificationStatus);
      console.log('  - Documents:', applicant1.metadata?.documents);
      console.log('  - Addresses:', applicant1.metadata?.addresses);
      console.log('  - Decline Reasons:', applicant1.metadata?.declineReasons);
      console.log('');
      console.log('📋 Full metadata:');
      console.log(JSON.stringify(applicant1.metadata, null, 2));
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('2️⃣ GET /applicants/{applicant_id}?verification_id={verification_id}');
    console.log('═'.repeat(70));
    if (session.kycaidVerificationId) {
      try {
        const applicant2 = await kycaidAdapter.getApplicant(
          session.kycaidApplicantId!,
          session.kycaidVerificationId
        );
        console.log('✅ Response:');
        console.log('  - Status:', applicant2.status);
        console.log('  - Verification Status:', applicant2.metadata?.verificationStatus);
        console.log('  - Documents:', applicant2.metadata?.documents);
        console.log('');
        console.log('📋 Full metadata:');
        console.log(JSON.stringify(applicant2.metadata, null, 2));
      } catch (error: any) {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.log('⚠️ No verification_id available');
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('3️⃣ GET /verifications/{verification_id}');
    console.log('═'.repeat(70));
    if (session.kycaidVerificationId) {
      try {
        const verification = await kycaidAdapter.getVerificationStatus(session.kycaidVerificationId);
        console.log('✅ Response:');
        console.log('  - Status:', verification.status);
        console.log('  - Rejection Reason:', verification.rejectionReason || 'N/A');
        console.log('  - Completed At:', verification.completedAt || 'N/A');
        console.log('');
        console.log('📋 Full metadata:');
        console.log(JSON.stringify(verification.metadata, null, 2));
      } catch (error: any) {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.log('⚠️ No verification_id available');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugApplicant();

