/**
 * Test script to check what data KYCAID returns for verification
 */

import { prisma } from './src/lib/prisma';
import { kycaidAdapter } from './src/lib/integrations/providers/kyc/KycaidAdapter';
import { getIntegrationWithSecrets } from './src/lib/services/integration-management.service';

async function testKycaidData() {
  try {
    const sessionId = 'cmhb6w3640003yofizeu0bic2';
    console.log('📄 Testing KYCAID data for session:', sessionId);
    
    // Get session
    const session = await prisma.kycSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.error('Session not found');
      return;
    }
    
    console.log('Applicant ID:', session.kycaidApplicantId);
    console.log('Verification ID:', session.kycaidVerificationId);
    
    // Get secrets
    const secrets = await getIntegrationWithSecrets('kycaid');
    if (!secrets?.apiKey) {
      console.error('No API key');
      return;
    }
    
    await kycaidAdapter.initialize({
      apiKey: secrets.apiKey,
      apiEndpoint: secrets.apiEndpoint || undefined,
      ...secrets.config
    });
    
    // Get verification details
    if (session.kycaidVerificationId) {
      console.log('\n📊 Getting verification details...');
      const verification = await kycaidAdapter.getVerificationStatus(session.kycaidVerificationId);
      console.log('Verification data:', JSON.stringify(verification, null, 2));
    }
    
    // Get applicant details
    if (session.kycaidApplicantId) {
      console.log('\n👤 Getting applicant details...');
      const applicant = await kycaidAdapter.getApplicant(session.kycaidApplicantId);
      console.log('Applicant data:', JSON.stringify(applicant, null, 2));
    }
    
    // Try to get documents
    if (session.kycaidApplicantId) {
      console.log('\n📄 Trying to get documents...');
      try {
        const documents = await kycaidAdapter.getApplicantDocuments(session.kycaidApplicantId);
        console.log(`Found ${documents.length} documents`);
        console.log('Documents:', JSON.stringify(documents, null, 2));
      } catch (error: any) {
        console.error('Failed to get documents:', error.message);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testKycaidData();

