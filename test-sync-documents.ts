/**
 * Test script to sync KYC documents
 */

import { syncKycDocuments } from './src/lib/services/kyc.service';
import { prisma } from './src/lib/prisma';

async function testSync() {
  try {
    const sessionId = 'cmhb6w3640003yofizeu0bic2';
    console.log('🧪 Testing document sync for session:', sessionId);
    
    // Check session exists
    const session = await prisma.kycSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.error('❌ Session not found');
      return;
    }
    
    console.log('✅ Session found');
    console.log('  - Status:', session.status);
    console.log('  - Applicant ID:', session.kycaidApplicantId);
    console.log('  - Verification ID:', session.kycaidVerificationId);
    
    // Try to sync
    console.log('\n📥 Starting sync...\n');
    const result = await syncKycDocuments(sessionId);
    
    console.log('\n✅ Sync completed!');
    console.log('  - Documents synced:', result.documentsCount);
    console.log('  - Message:', result.message);
    
    // Show documents in DB
    const documents = await prisma.kycDocument.findMany({
      where: { kycSessionId: sessionId }
    });
    
    console.log('\n📄 Documents in database:', documents.length);
    documents.forEach(doc => {
      console.log(`  - ${doc.type}: ${doc.documentNumber || 'N/A'} (${doc.externalId})`);
    });
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();

