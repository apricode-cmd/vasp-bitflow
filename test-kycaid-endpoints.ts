/**
 * Test different KYCAID endpoints to find documents
 */

import { prisma } from './src/lib/prisma';
import { decrypt } from './src/lib/services/encryption.service';

async function testKycaidEndpoints() {
  try {
    console.log('🔍 Testing KYCAID Endpoints for Documents\n');
    
    // Get integration
    const integration = await prisma.integration.findUnique({
      where: { service: 'kycaid' }
    });
    
    if (!integration?.apiKey) {
      console.error('❌ No KYCAID integration');
      return;
    }
    
    const apiKey = decrypt(integration.apiKey);
    const baseUrl = (integration.apiEndpoint || 'https://api.kycaid.com').replace(/\/$/, '');
    
    // Get session
    const session = await prisma.kycSession.findFirst({
      where: {
        status: 'APPROVED',
        kycaidApplicantId: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!session) {
      console.error('❌ No APPROVED session');
      return;
    }
    
    console.log('📋 Testing with:');
    console.log('  - Applicant ID:', session.kycaidApplicantId);
    console.log('  - Verification ID:', session.kycaidVerificationId || 'N/A');
    console.log('');
    
    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: GET /applicants/{id}
    console.log('═'.repeat(70));
    console.log('1️⃣ GET /applicants/{applicant_id}');
    console.log('═'.repeat(70));
    try {
      const url = `${baseUrl}/applicants/${session.kycaidApplicantId}`;
      console.log('URL:', url);
      
      const res = await fetch(url, { headers });
      console.log('Status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Success');
        console.log('Response keys:', Object.keys(data));
        console.log('Documents field:', data.documents);
        console.log('');
        console.log('Full response:');
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Failed:', await res.text());
      }
    } catch (error: any) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('');
    
    // Test 2: GET /verifications/{id}
    if (session.kycaidVerificationId) {
      console.log('═'.repeat(70));
      console.log('2️⃣ GET /verifications/{verification_id}');
      console.log('═'.repeat(70));
      try {
        const url = `${baseUrl}/verifications/${session.kycaidVerificationId}`;
        console.log('URL:', url);
        
        const res = await fetch(url, { headers });
        console.log('Status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Success');
          console.log('Response keys:', Object.keys(data));
          console.log('');
          console.log('Full response:');
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log('❌ Failed:', await res.text());
        }
      } catch (error: any) {
        console.log('❌ Error:', error.message);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testKycaidEndpoints();

