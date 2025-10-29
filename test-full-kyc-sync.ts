/**
 * Complete KYC Document Sync Test
 * 
 * This script tests the full flow:
 * 1. Find a KYC session
 * 2. Get applicant data from KYCAID
 * 3. Get documents
 * 4. Save to database
 * 5. Display results
 */

import { syncKycDocuments } from './src/lib/services/kyc.service';
import { prisma } from './src/lib/prisma';

async function testFullFlow() {
  try {
    console.log('🧪 Complete KYC Document Sync Test');
    console.log('═'.repeat(70));
    console.log('');

    // Find all APPROVED/REJECTED sessions
    const sessions = await prisma.kycSession.findMany({
      where: {
        OR: [
          { status: 'APPROVED' },
          { status: 'REJECTED' }
        ],
        kycaidApplicantId: { not: null }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    console.log(`📋 Found ${sessions.length} completed KYC session(s):\n`);

    sessions.forEach((session, idx) => {
      console.log(`${idx + 1}. Session ID: ${session.id}`);
      console.log(`   User: ${session.user.email}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Applicant ID: ${session.kycaidApplicantId}`);
      console.log(`   Verification ID: ${session.kycaidVerificationId || 'N/A'}`);
      console.log('');
    });

    if (sessions.length === 0) {
      console.log('❌ No completed sessions found');
      console.log('💡 Complete a KYC verification first');
      return;
    }

    // Test with first session
    const testSession = sessions[0];
    console.log('═'.repeat(70));
    console.log(`🎯 Testing sync for session: ${testSession.id}`);
    console.log('═'.repeat(70));
    console.log('');

    // Sync documents
    console.log('📥 Starting document sync...\n');
    const result = await syncKycDocuments(testSession.id);

    console.log('');
    console.log('═'.repeat(70));
    console.log('✅ SYNC COMPLETED!');
    console.log('═'.repeat(70));
    console.log('');
    console.log(`📊 Result:`);
    console.log(`   - Documents synced: ${result.documentsCount}`);
    console.log(`   - Message: ${result.message}`);
    console.log('');

    // Display synced documents
    const documents = await prisma.kycDocument.findMany({
      where: { kycSessionId: testSession.id },
      orderBy: { uploadedAt: 'desc' }
    });

    if (documents.length === 0) {
      console.log('ℹ️ No documents in database');
      console.log('💡 This might mean:');
      console.log('   - User did not upload documents in KYCAID form');
      console.log('   - Documents are not yet processed by KYCAID');
      console.log('   - applicant_id has no associated documents');
      return;
    }

    console.log('═'.repeat(70));
    console.log(`📄 Documents in database (${documents.length}):`);
    console.log('═'.repeat(70));
    console.log('');

    documents.forEach((doc, idx) => {
      const data = doc.verificationData as any;
      
      console.log(`${idx + 1}. ${doc.documentType}`);
      console.log(`   ├─ ID: ${doc.id}`);
      console.log(`   ├─ File: ${doc.fileName}`);
      console.log(`   ├─ Verified by AI: ${doc.verifiedByAI ? '✅ Yes' : '❌ No'}`);
      console.log(`   ├─ File URL: ${doc.fileUrl ? '✅ Available' : '❌ Missing'}`);
      console.log(`   ├─ Document #: ${data?.document_number || 'N/A'}`);
      console.log(`   ├─ Issue Date: ${data?.issue_date || 'N/A'}`);
      console.log(`   ├─ Expiry Date: ${data?.expiry_date || 'N/A'}`);
      console.log(`   ├─ Status: ${data?.status || 'N/A'}`);
      console.log(`   ├─ Provider: ${data?.provider || 'N/A'}`);
      
      if (data?.decline_reasons && data.decline_reasons.length > 0) {
        console.log(`   ├─ ❌ Decline Reasons:`);
        data.decline_reasons.forEach((reason: string) => {
          console.log(`   │  └─ ${reason}`);
        });
      }
      
      console.log(`   ├─ Front Side: ${data?.front_side ? '✅' : '❌'}`);
      console.log(`   ├─ Back Side: ${data?.back_side ? '✅' : '❌'}`);
      console.log(`   └─ Uploaded: ${doc.uploadedAt.toISOString()}`);
      console.log('');
    });

    console.log('═'.repeat(70));
    console.log('✅ TEST COMPLETE');
    console.log('═'.repeat(70));

  } catch (error: any) {
    console.error('');
    console.error('═'.repeat(70));
    console.error('❌ ERROR');
    console.error('═'.repeat(70));
    console.error('');
    console.error('Message:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFullFlow();

