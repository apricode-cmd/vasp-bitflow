/**
 * Test sync documents with detailed logging
 */

import { syncKycDocuments } from './src/lib/services/kyc.service';
import { prisma } from './src/lib/prisma';

async function testSync() {
  try {
    const sessionId = 'cmhb6w3640003yofizeu0bic2';
    console.log('🧪 Testing sync for session:', sessionId);
    console.log('─'.repeat(60));
    
    // Check session
    const session = await prisma.kycSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.error('❌ Session not found');
      return;
    }
    
    console.log('✅ Session found:');
    console.log('  - Status:', session.status);
    console.log('  - Applicant ID:', session.kycaidApplicantId);
    console.log('  - Verification ID:', session.kycaidVerificationId);
    console.log('  - Form ID:', session.kycaidFormId);
    console.log('');
    
    // Check requirements
    if (!session.kycaidApplicantId) {
      console.error('❌ No applicant ID');
      return;
    }
    
    if (!session.kycaidVerificationId) {
      console.error('❌ No verification ID - cannot sync documents');
      console.log('💡 Documents are only available with verification_id');
      return;
    }
    
    if (session.status !== 'APPROVED' && session.status !== 'REJECTED') {
      console.error(`❌ Status is ${session.status} - must be APPROVED or REJECTED`);
      return;
    }
    
    console.log('✅ All requirements met, starting sync...');
    console.log('─'.repeat(60));
    console.log('');
    
    // Sync
    const result = await syncKycDocuments(sessionId);
    
    console.log('');
    console.log('─'.repeat(60));
    console.log('✅ SUCCESS!');
    console.log('  - Documents synced:', result.documentsCount);
    console.log('  - Message:', result.message);
    
    // Show documents
    const docs = await prisma.kycDocument.findMany({
      where: { kycSessionId: sessionId },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        verifiedByAI: true,
        uploadedAt: true,
        verificationData: true
      }
    });
    
    console.log('');
    console.log('📄 Documents in database:', docs.length);
    docs.forEach((doc, idx) => {
      const data = doc.verificationData as any;
      console.log(`\n  ${idx + 1}. ${doc.documentType}`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     File: ${doc.fileName}`);
      console.log(`     Verified: ${doc.verifiedByAI ? '✅' : '❌'}`);
      console.log(`     Document #: ${data?.document_number || 'N/A'}`);
      console.log(`     Status: ${data?.status || 'N/A'}`);
      console.log(`     Front URL: ${data?.front_side ? '✅' : '❌'}`);
      console.log(`     Back URL: ${data?.back_side ? '✅' : '❌'}`);
    });
    
  } catch (error: any) {
    console.error('');
    console.error('─'.repeat(60));
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();

